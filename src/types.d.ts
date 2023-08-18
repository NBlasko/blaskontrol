export type Newable<T> = new (...args: never[]) => T;
export type AbstractInstance = abstract new (...args: never[]) => unknown;
export type MetaMutation<T = AbstractInstance> = T & Record<symbol, ServiceMetadata>;

export interface ContainerOptions {
  /**
   * A callback function used to provide additional debug logs from the Container instance.
   * @param message - The debug message to be logged.
   * @example
   * const debug = console.debug; // or any other function with type (message: string) => void
   * const container = new Container({ debug });
   */
  debug: (message: string) => void;
}

export interface Factory<T> {
  service: AbstractInstance;
  handler: (that: T) => InstanceType<unknown>;
}

export type PublicScope = 'singleton' | 'request' | 'transient';

export interface ServiceMetadata {
  scope: PublicScope | 'mock';
  id: string;
  name: string;
}

export interface BindDynamicOptions {
  /**
   * The injection scope for the registered service.
   * @remarks
   * Injection scopes define how instances of classes are created and shared within the application.
   * Each scope serves a distinct purpose, influencing the lifecycle and availability of instances
   * when requested by different consumers.
   *
   * Available options:
   * - `'singleton'`: The service is created as a single instance that is shared throughout the application.
   * - `'request'`: A new instance of the service is created for each individual request.
   * - `'transient'`: Each consumer that requires this service will receive a new, independent instance.
   *
   * Note that the `'singleton'` scope is the default when using `bindAsConstant`.
   *
   * @example
   * // Setting scope to 'transient'
   * container.bindAsDynamic(Foo, () => new Foo(), { scope: 'transient' });
   *
   * // Using import for scope values
   * import { Scope } from 'blaskontrol';
   * container.bindAsDynamic(Foo, () => new Foo(), { scope: Scope.transient });
   */
  scope: PublicScope;
}

export type SnapshotBackup<T> =
  | {
      dependencies: null;
      factories: null;
      singletonInstances: null;
      isInTestingState: false;
    }
  | {
      dependencies: Map<string, unknown>;
      factories: Map<string, Factory<T>>;
      singletonInstances: Map<string, unknown>;
      isInTestingState: true;
    };

/**
 * Interface representing a Dependency Injection Container.
 */
export declare class IContainer {
  /**
   * Replace a service with a mock.
   * @param service - The service class to be replaced with a mock.
   * @param mockedHandler - The mocked implementation of the service.
   * @example
   * // Presume we want to mock the `Foo` class with `MockFoo`:
   *
   * class MockFoo {
   *   public getFoo() {
   *     return 'mockedFoo';
   *   }
   * }
   *
   * container.snapshot(); // A good place to run it is in the test framework lifecycle 'before', 'beforeAll', or 'beforeEach'.
   *
   * container.mock(Foo, new MockFoo());
   * const foo = container.get(Foo);
   * foo.getFoo(); // returns 'mockedFoo'
   *
   * container.restore(); // A good place to run it is in the test framework lifecycle 'after', 'afterAll' or 'afterEach'.
   */
  public mock<T extends AbstractInstance>(service: T, mockedHandler: unknown): this;

  /**
   * Register a service with dynamic resolution. The service will be resolved on method 'get' call.
   * @param service - The service class to be registered.
   * @param handler - A callback function that handles the strategy of resolving the service instance.
   * @param options - The options for binding the service, including the injection scope.
   * @example
   * // First, we register service Foo without dependencies
   * class Foo {
   *   public getFoo() {
   *     return 'foo';
   *   }
   * }
   *
   * container.bindAsDynamic(Foo, () => new Foo());
   *
   * // Next, we register service Bar that has Foo as a dependency
   * class Bar {
   *   constructor(private readonly foo: Foo) {}
   *
   *   public getFooFromFoo() {
   *     return this.foo.getFoo();
   *   }
   * }
   *
   * container.bindAsDynamic(Bar, (c) => new Bar(c.get(Foo)));
   */
  public bindAsDynamic<T extends AbstractInstance>(
    service: T,
    handler: (c: IContainer) => InstanceType<T>,
    options: BindDynamicOptions,
  ): this;

  /**
   * Cache all dependencies and service factories. Use it before mocking any service in tests.
   * It goes in combination with the 'restore' method.
   * @example
   * class MockFoo {
   *   public getFoo() {
   *     return 'mockedFoo';
   *   }
   * }
   *
   * container.snapshot(); // A good place to run it is in the test framework lifecycle 'before', 'beforeAll' or 'beforeEach'.
   *
   * container.mock(Foo, new MockFoo());
   * const foo = container.get(Foo);
   * foo.getFoo(); // returns 'mockedFoo'
   *
   * container.restore(); // A good place to run it is in the test framework lifecycle 'after', 'afterAll' or 'afterEach'.
   */
  public snapshot(): void;

  /**
   * Clear all mocks and restore the state of dependencies and service factories
   * to the state before the 'snapshot' method was triggered. Use it after running tests with mocked services.
   * It goes in combination with the 'snapshot' method.
   * @example
   * class MockFoo {
   *   public getFoo() {
   *     return 'mockedFoo';
   *   }
   * }
   *
   * container.snapshot(); // A good place to run it is in the test framework lifecycle 'before', 'beforeAll' or 'beforeEach'.
   *
   * container.mock(Foo, new MockFoo());
   * const foo = container.get(Foo);
   * foo.getFoo(); // returns 'mockedFoo'
   *
   * container.restore(); // A good place to run it is in the test framework lifecycle 'after', 'afterAll' or 'afterEach'.
   */
  public restore(): void;

  /**
   *  Clear all mocks.
   *  A good place to run it is in the test framework lifecycle 'beforeEach' or 'afterEach'.
   *  We can achieve a similar result by calling restore and then snapshot.
   */
  public clearMocks(): void;

  /**
   * Create a child container. Child Containers are containers that should live during the request.
   * They can be handy if, during the request lifetime,
   * we need to register additional services that should not exist in the parent container
   * or should rebind existing services in the parent container but not change them on the parent level.
   * Also, child containers provide isolation between requests,
   * as they are holding isolated services with 'request' and 'transient' injection scope.
   * In child containers, you bind only request or transient scoped services.
   * @example
   * class UserContext {
   *   constructor(private readonly personalData: string) {}
   *   public getPersonalData() {
   *     return `User personal data: ${this.personalData} `;
   *   }
   * }
   *
   * class Helper {
   *   public getSomething() {
   *     return 'Get some helper data';
   *   }
   * }
   *
   * class ChildHelper implements Helper {
   *   public getSomething() {
   *     return 'Get some other data from an instance registered in the child container';
   *   }
   * }
   *
   * const container = new Container();
   *
   * // Bind Helper in the parent container as request-scoped
   * container.bindAsDynamic(Helper, () => new Helper(), { scope: 'transient' });
   *
   * const childContainer = container.createChild();
   *
   * // Bind a new service with some request isolated data
   * childContainer.bindAsDynamic(UserContext, () => new UserContext('My secret'), { scope: 'request' });
   *
   * // Rebind Helper service with a new ChildHelper service
   * childContainer.bindAsDynamic(Helper, () => new ChildHelper(), { scope: 'transient' });
   *
   * // Notice, if we try to rebind Helper in the child container with a different scope, we will ignore that change
   * childContainer.bindAsDynamic(Helper, () => new ChildHelper(), { scope: 'request' }); // Will stay transient scope from already created
   *
   * @returns The child container.
   */
  public createChild(): IContainer;

  /**
   * Register a service as a constant. The service will be resolved at the time of registration, before use.
   * @param service - The service class to be registered.
   * @param serviceInstance - An instance of the service to be used for resolution.
   * @example
   * // Registering service Foo as a constant
   * class Foo {
   *   public getFoo() {
   *     return 'foo';
   *   }
   * }
   *
   * container.bindAsConstant(Foo, new Foo());
   */
  public bindAsConstant<T extends AbstractInstance>(service: T, serviceInstance: InstanceType<T>): this;

  /**
   * Get the instance of a previously registered service.
   * @param service - The service class to be resolved.
   * @returns The resolved service instance.
   * @example
   * // If we have registered service Foo previously
   * class Foo {
   *   public getFoo() {
   *     return 'foo';
   *   }
   * }
   *
   * // We can get an instance of Foo
   * const foo = container.get(Foo);
   * foo.getFoo(); // returns 'foo'
   */
  public get<T>(service: Newable<T>): T;
}
