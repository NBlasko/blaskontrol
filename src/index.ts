type Newable<T> = new (...args: never[]) => T;
type AbstractInstance = abstract new (...args: never[]) => unknown;
type MetaMutation<T = AbstractInstance> = T & Record<symbol, ClassMetadata>;

interface ContainerOptions {
  debug: (message: string) => void;
}

interface IFactory {
  dynamicClass: AbstractInstance;
  handler: (that: Container) => unknown;
}

type PublicScope = 'singleton' | 'request' | 'transient';

interface ClassMetadata {
  scope: PublicScope | 'mock';
  id: string;
  name: string;
}

interface BindDynamicOptions {
  scope: PublicScope;
}

interface SnapshotBackup {
  dependencies: null | Map<string, unknown>;
  factories: null | Map<string, IFactory>;
  singletonInstances: null | Map<string, unknown>;
  isInTestingState: boolean;
}

export class Container {
  private metaIoC = Symbol('metaIoC');
  private dependencies = new Map<string, unknown>();
  private factories = new Map<string, IFactory>();
  private singletonInstances = new Map<string, unknown>();
  private mockedDependencies = new Map<string, unknown>();
  private id = 0;
  private isChild = false;
  private debug: ContainerOptions['debug'] = () => null;
  private snapshotBackup: SnapshotBackup = {
    dependencies: null,
    factories: null,
    singletonInstances: null,
    isInTestingState: false,
  };

  constructor(readonly options?: ContainerOptions) {
    if (options?.debug) this.debug = options.debug;
  }

  snapshot() {
    this.snapshotBackup = {
      dependencies: this.dependencies,
      factories: this.factories,
      singletonInstances: this.singletonInstances,
      isInTestingState: true,
    };
    this.dependencies = new Map();
    this.factories = new Map(this.factories);
    this.singletonInstances = new Map(this.singletonInstances);
  }

  public restore() {
    if (this.isChild) {
      throw new Error("Not available to restore to defaults by calling the method 'restore' from the child container");
    }
    this.mockedDependencies.clear();
    this.dependencies = this.snapshotBackup.dependencies ?? new Map<string, unknown>();
    this.singletonInstances = this.snapshotBackup.singletonInstances ?? new Map<string, unknown>();
    this.factories = this.snapshotBackup.factories ?? new Map<string, IFactory>();
    this.snapshotBackup = { dependencies: null, factories: null, singletonInstances: null, isInTestingState: false };
  }

  public createChild() {
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

  /**
   * @description Singleton - registered ahead of time, before the use
   * @example   
    
    class Foo {
        public getFoo() {
            return 'foo';
        }
    }

    container.bindAsConstant(Foo, new Foo());
   */
  public bindAsConstant<T extends AbstractInstance>(clazz: T, clazzInstance: InstanceType<T>): this {
    if (this.isChild) throw new Error('Singletons must be bound in the parent container');

    if ((clazz as MetaMutation<T>)[this.metaIoC]) throw new Error(`Class ${clazz?.name} is already registered`);

    const metaData = this.generateMetadata('singleton', clazz.name);
    (clazzInstance as MetaMutation)[this.metaIoC] = metaData;
    this.appendMetadataToClass(clazz, metaData);
    this.singletonInstances.set(metaData.id, clazzInstance);
    this.dependencies.set(metaData.id, clazzInstance);
    this.debug(`Container registers class ${metaData.name} with id ${metaData.id} as a singleton`);
    return this;
  }

  public bindAsDynamic<T extends AbstractInstance>(
    clazz: T,
    handler: (c: Container) => InstanceType<T>,
    options: BindDynamicOptions = { scope: 'singleton' },
  ): this {
    if (this.isChild) {
      this.bindOnChildAsDynamic(clazz, handler, options);
      return this;
    }

    this.bindOnParentAsDynamic(clazz, handler, options);
    return this;
  }

  private getOrAddMockMetadata<T extends AbstractInstance>(clazz: T): ClassMetadata {
    const foundMetaData = (clazz as MetaMutation<T>)[this.metaIoC];
    if (foundMetaData) return foundMetaData;

    const metaData = this.generateMetadata('mock', clazz.name);
    this.appendMetadataToClass(clazz, metaData);
    return metaData;
  }

  public mock<T extends AbstractInstance>(clazz: T, mockedHandler: unknown): this {
    if (!this.snapshotBackup.isInTestingState) {
      throw new Error("Must execute method 'snapshot()' before using mock");
    }

    const metaData = this.getOrAddMockMetadata(clazz);

    this.mockedDependencies.set(metaData.id, mockedHandler);
    return this;
  }

  public get<T>(clazz: Newable<T>): T {
    const metaData = (clazz as MetaMutation<Newable<T>>)?.[this.metaIoC];
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
    if (factory) {
      return this.resolveFactory<T>(factory, metaData);
    }

    throw new Error(`Missing module with class name ${name}`);
  }

  private resolveFactory<T>(parentFactory: IFactory, meta: ClassMetadata) {
    const parentHandler = parentFactory.handler(this);

    if (meta.scope === 'singleton') {
      this.singletonInstances.set(meta.id, parentHandler);
      this.dependencies.set(meta.id, parentHandler);
      this.debug(`Container resolved class ${meta.name} with id ${meta.id} as a singleton`);
      return parentHandler as T;
    }

    if (meta.scope === 'request' && this.isChild) {
      this.dependencies.set(meta.id, parentHandler);
      this.debug(`Container resolved class ${meta.name} with id ${meta.id} as a request scoped`);
      return parentHandler as T;
    }

    this.debug(`Container resolved class ${meta.name} with id ${meta.id} as transient scoped`);
    return parentHandler as T;
  }

  private bindOnChildAsDynamic<T extends AbstractInstance>(
    clazz: T,
    handler: (c: Container) => InstanceType<T>,
    options: BindDynamicOptions,
  ): void {
    if (options.scope === 'singleton') {
      throw new Error('Singletons must be bound in the parent container');
    }

    const factory = { dynamicClass: clazz, handler };

    const metaData = (clazz as MetaMutation<T>)[this.metaIoC] ?? this.generateMetadata(options.scope, clazz.name);
    this.appendMetadataToClass(clazz, metaData);
    this.factories.set(metaData.id, factory);
    this.debug(`Child container registers class ${metaData.name} with id ${metaData.id} as a ${metaData.scope} scoped`);
  }

  private bindOnParentAsDynamic<T extends AbstractInstance>(
    clazz: T,
    handler: (c: Container) => InstanceType<T>,
    options: BindDynamicOptions,
  ): void {
    const foundMeta = (clazz as MetaMutation<T>)[this.metaIoC];
    if (foundMeta) {
      throw new Error(`Class ${clazz?.name} is already registered`);
    }

    const factory = { dynamicClass: clazz, handler };
    const metaData = this.generateMetadata(options.scope, clazz.name);
    this.appendMetadataToClass(clazz, metaData);
    this.factories.set(metaData.id, factory);
    this.debug(
      `Parent container registers class ${metaData.name} with id ${metaData.id} as a ${metaData.scope} scoped`,
    );
  }

  private appendMetadataToClass<T extends AbstractInstance>(clazz: T, metaData: ClassMetadata): void {
    (clazz as unknown as MetaMutation)[this.metaIoC] = metaData;
  }

  private generateMetadata(scope: ClassMetadata['scope'], name: ClassMetadata['name'] = 'unknown'): ClassMetadata {
    const id = `di${++this.id}`;
    return { scope, id, name };
  }
}
