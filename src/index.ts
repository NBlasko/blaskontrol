import type {
  AbstractInstance,
  BindDynamicOptions,
  IContainer,
  ContainerOptions,
  Factory,
  MetaMutation,
  Newable,
  ServiceMetadata,
  SnapshotBackup,
} from './types';

export const Scope = {
  singleton: 'singleton',
  request: 'request',
  transient: 'transient',
} as const;

export class Container implements IContainer {
  private metaIoC = Symbol('metaIoC');
  private dependencies = new Map<string, unknown>();
  private factories = new Map<string, Factory<Container>>();
  private singletonInstances = new Map<string, unknown>();
  private mockedDependencies = new Map<string, unknown>();
  private id = 0;
  private isChild = false;
  private debug: ContainerOptions['debug'] = () => null;
  private snapshotBackup: SnapshotBackup<Container> = {
    dependencies: null,
    factories: null,
    singletonInstances: null,
    isInTestingState: false,
  };

  constructor(readonly options?: ContainerOptions) {
    if (options?.debug) this.debug = options.debug;
  }

  public snapshot(): void {
    this.snapshotBackup = {
      dependencies: this.dependencies,
      factories: this.factories,
      singletonInstances: this.singletonInstances,
      isInTestingState: true,
    };
    this.dependencies = new Map<string, unknown>();
    this.factories = new Map<string, Factory<Container>>(this.factories);
    this.singletonInstances = new Map<string, unknown>(this.singletonInstances);
  }

  public restore(): void {
    if (this.isChild) {
      throw new Error("Not available to restore to defaults by calling the method 'restore' from the child container");
    }
    this.mockedDependencies.clear();
    this.dependencies = this.snapshotBackup.dependencies ?? new Map<string, unknown>();
    this.singletonInstances = this.snapshotBackup.singletonInstances ?? new Map<string, unknown>();
    this.factories = this.snapshotBackup.factories ?? new Map<string, Factory<Container>>();
    this.snapshotBackup = { dependencies: null, factories: null, singletonInstances: null, isInTestingState: false };
  }

  public createChild(): Container {
    const di = new Container();
    di.metaIoC = this.metaIoC;
    di.isChild = true;
    di.factories = new Map(this.factories);
    di.singletonInstances = this.singletonInstances;
    di.mockedDependencies = this.mockedDependencies;
    di.id = this.id;
    di.debug = this.debug;
    return di;
  }

  public bindAsConstant<T extends AbstractInstance>(service: T, serviceInstance: InstanceType<T>): this {
    if (this.isChild) throw new Error('Singletons must be bound in the parent container');

    if ((service as MetaMutation<T>)[this.metaIoC]) throw new Error(`Service ${service?.name} is already registered`);

    const metaData = this.generateMetadata('singleton', service.name);
    (serviceInstance as MetaMutation)[this.metaIoC] = metaData;
    this.appendMetadataToService(service, metaData);
    this.singletonInstances.set(metaData.id, serviceInstance);
    this.dependencies.set(metaData.id, serviceInstance);
    this.debug(`Container registers service ${metaData.name} with id ${metaData.id} as a singleton`);
    return this;
  }

  public bindAsDynamic<T extends AbstractInstance>(
    service: T,
    handler: (c: Container) => InstanceType<T>,
    options: BindDynamicOptions = { scope: 'singleton' },
  ): this {
    if (this.isChild) {
      this.bindOnChildAsDynamic(service, handler, options);
      return this;
    }

    this.bindOnParentAsDynamic(service, handler, options);
    return this;
  }

  public mock<T extends AbstractInstance>(service: T, mockedHandler: unknown): this {
    if (!this.snapshotBackup.isInTestingState) {
      throw new Error("Must execute method 'snapshot()' before using mock");
    }

    const metaData = this.getOrAddMockMetadata(service);

    this.mockedDependencies.set(metaData.id, mockedHandler);
    return this;
  }

  public get<T>(service: Newable<T>): T {
    const metaData = (service as MetaMutation<Newable<T>>)?.[this.metaIoC];
    if (!metaData) {
      throw new Error('Missing injected value');
    }

    const { id, name } = metaData;

    const mockedDependency = this.mockedDependencies.get(id);
    if (mockedDependency) return mockedDependency as T;

    const dependency = this.dependencies.get(id);
    if (dependency) return dependency as T;

    const singletonInstance = this.singletonInstances.get(id);
    if (singletonInstance) {
      this.dependencies.set(id, singletonInstance);
      return singletonInstance as T;
    }

    const factory = this.factories.get(id);
    if (factory) return this.resolveFactory<T>(factory, metaData);

    throw new Error(`Missing module with service name ${name}`);
  }

  private getOrAddMockMetadata<T extends AbstractInstance>(service: T): ServiceMetadata {
    const foundMetaData = (service as MetaMutation<T>)[this.metaIoC];
    if (foundMetaData) return foundMetaData;

    const metaData = this.generateMetadata('mock', service.name);
    this.appendMetadataToService(service, metaData);
    return metaData;
  }

  private resolveFactory<T>(parentFactory: Factory<Container>, meta: ServiceMetadata) {
    const parentHandler = parentFactory.handler(this);

    if (meta.scope === 'singleton') {
      this.singletonInstances.set(meta.id, parentHandler);
      this.dependencies.set(meta.id, parentHandler);
      this.debug(`Container resolved service ${meta.name} with id ${meta.id} as a singleton`);
      return parentHandler as T;
    }

    if (meta.scope === 'request' && this.isChild) {
      this.dependencies.set(meta.id, parentHandler);
      this.debug(`Container resolved service ${meta.name} with id ${meta.id} as a request scoped`);
      return parentHandler as T;
    }

    this.debug(`Container resolved service ${meta.name} with id ${meta.id} as transient scoped`);
    return parentHandler as T;
  }

  private bindOnChildAsDynamic<T extends AbstractInstance>(
    service: T,
    handler: (c: Container) => InstanceType<T>,
    options: BindDynamicOptions,
  ): void {
    if (options.scope === 'singleton') {
      throw new Error('Singletons must be bound in the parent container');
    }

    const factory = { service, handler };

    const metaData = (service as MetaMutation<T>)[this.metaIoC] ?? this.generateMetadata(options.scope, service.name);

    if (metaData.scope !== options.scope && metaData.scope !== 'mock') {
      this.debug(
        `Changing scope in child container from ${metaData.scope} to ${options.scope} will be ignored.
        Please, update parent container with proper injection scope`,
      );
    }

    this.appendMetadataToService(service, metaData);
    this.factories.set(metaData.id, factory);
    this.debug(
      `Child container registers service ${metaData.name} with id ${metaData.id} as a ${metaData.scope} scoped`,
    );
  }

  private bindOnParentAsDynamic<T extends AbstractInstance>(
    service: T,
    handler: (c: Container) => InstanceType<T>,
    options: BindDynamicOptions,
  ): void {
    const foundMeta = (service as MetaMutation<T>)[this.metaIoC];
    if (foundMeta) {
      throw new Error(`Service ${service?.name} is already registered`);
    }

    const factory = { service, handler };
    const metaData = this.generateMetadata(options.scope, service.name);
    this.appendMetadataToService(service, metaData);
    this.factories.set(metaData.id, factory);
    this.debug(
      `Parent container registers service ${metaData.name} with id ${metaData.id} as a ${metaData.scope} scoped`,
    );
  }

  private appendMetadataToService<T extends AbstractInstance>(service: T, metaData: ServiceMetadata): void {
    (service as unknown as MetaMutation)[this.metaIoC] = metaData;
  }

  private generateMetadata(
    scope: ServiceMetadata['scope'],
    name: ServiceMetadata['name'] = 'unknown',
  ): ServiceMetadata {
    const id = `di${++this.id}`;
    return { scope, id, name };
  }
}
