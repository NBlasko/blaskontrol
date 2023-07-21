export type Newable<T> = new (...args: never[]) => T;
export type AbstractInstance = abstract new (...args: never[]) => unknown;
export type MetaMutation<T = AbstractInstance> = T & Record<symbol, ServiceMetadata>;

export interface ContainerOptions {
  debug: (message: string) => void;
}

export interface Factory {
  service: AbstractInstance;
  handler: (that: Container) => InstanceType<unknown>;
}

export type PublicScope = 'singleton' | 'request' | 'transient';

export interface ServiceMetadata {
  scope: PublicScope | 'mock';
  id: string;
  name: string;
}

export interface BindDynamicOptions {
  scope: PublicScope;
}

export interface SnapshotBackup {
  dependencies: null | Map<string, unknown>;
  factories: null | Map<string, Factory>;
  singletonInstances: null | Map<string, unknown>;
  isInTestingState: boolean;
}

export declare class ContainerInterface {
  /**
   * @description Replace service with mock.
   * Mocking services requires running the `snapshot` method before mocking
   * a class and the `restore` after using the mocked version of a class instance.
   * @example 
   // Presume we want to mock the `Foo` class with `MockFoo`:

    class MockFoo {
        public getFoo() {
            return 'mockedFoo';
        }
    }

    container.snapshot(); // A good place to run it is in the test framework lifecycle 'before', 'beforeAll', or 'beforeEach'.

    container.mock(Foo, new MockFoo());
    const foo = container.get(Foo);
    foo.getFoo() // returns 'mockedFoo'

    container.restore(); // A good place to run it is in the test framework lifecycle 'after', 'afterAll' or 'afterEach'.
*/
  public mock<T extends AbstractInstance>(service: T, mockedHandler: unknown): this;

  /**
 * @description Resolved on method 'get' call
 * @example
 * 
  // First, we register service Foo without dependencies
  class Foo {
        public getFoo() {
            return 'foo';
        }
  }

  container.bindAsDynamic(Foo, () => new Foo());

  // Next, we register service Bar that has Foo as a dependency
  class Bar {
    constructor(private readonly foo: Foo) {}

    public getFooFromFoo() {
      return this.foo.getFoo();
    }
  } 

  container.bindAsDynamic(Bar, (c) => new Bar(c.get(Foo)));
 */
  public bindAsDynamic<T extends AbstractInstance>(
    service: T,
    handler: (c: Container) => InstanceType<T>,
    options: BindDynamicOptions = { scope: 'singleton' },
  ): this;

  /**
   * @description Caches all dependencies and service factories. Use it before mocking any service in tests.
   * It goes in combination with 'restore' method
   * @example
    class MockFoo {
        public getFoo() {
            return 'mockedFoo';
        }
    }

    container.snapshot(); // A good place to run it is in the test framework lifecycle 'before', 'beforeAll' or 'beforeEach'.

    container.mock(Foo, new MockFoo());
    const foo = container.get(Foo);
    foo.getFoo() // returns 'mockedFoo'

    container.restore(); // A good place to run it is in the test framework lifecycle 'after', 'afterAll' or 'afterEach'. 
  
   */
  public snapshot(): void;

  /**
   * @description Clears all mocks and restores state of dependencies and service factories before method snapshot was
   * triggered. Use it after running tests with mocked services.
   * It goes in combination with 'snapshot' method
   * @example
    class MockFoo {
        public getFoo() {
            return 'mockedFoo';
        }
    }

    container.snapshot(); // A good place to run it is in the test framework lifecycle 'before', 'beforeAll' or 'beforeEach'.

    container.mock(Foo, new MockFoo());
    const foo = container.get(Foo);
    foo.getFoo() // returns 'mockedFoo'

    container.restore(); // A good place to run it is in the test framework lifecycle 'after', 'afterAll' or 'afterEach'. 
  
   */
  public restore(): void;

  /**
   * @description Child Containers are containers that should live during the request.
   * They can be handy if, during the request lifetime,
   * we need to register additional services that should not exist in the parent container
   * or should rebind existing services in the parent container but not change them on the parent level.
   * Also, child containers provide isolation between requests,
   * as they are holding isolated services with 'request' and 'transient' injection scope.
     In child containers, you bind only request or transient scoped services.

   * @example
    class UserContext {
        constructor(private readonly personalData: string) {}
        public getPersonalData() {
            return `User personal data: ${this.personalData} `;
        }
    }

    class Helper {
        public getSomething() {
            return 'Get some helper data';
        }
    }

    class ChildHelper implements Helper {
      public getSomething() {
        return 'Get some other data from instance registered in child container';
      }
    }

    const container = new Container();

    // bind Helper in parent container as request-scoped
    container.bindAsDynamic(Helper, () => new Helper(), { scope: 'transient' });

    const childContainer = container.createChild();

    // bind new service with some request isolated data
    childContainer.bindAsDynamic(UserContext, () => new UserContext('My secret'), { scope: 'request' });

    // or rebind Helper srevice with new ChildHelper service
    childContainer.bindAsDynamic(Helper, () => new ChildHelper(), { scope: 'transient' });

    // Notice, if we try to rebind Helper in child container with different scope, we will ignore that change
    childContainer.bindAsDynamic(Helper, () => new ChildHelper(), { scope: 'request' }); // will stay transient scope from already created

   * @returns child container
   */
  public createChild(): Container;

  /**
   * @description Singleton - resolved at the time of registration, before the use
   * @example   
    
    class Foo {
        public getFoo() {
            return 'foo';
        }
    }

    container.bindAsConstant(Foo, new Foo());
   */
  public bindAsConstant<T extends AbstractInstance>(service: T, serviceInstance: InstanceType<T>): this;

  /**
   * 
   * @description get the instance of previously registered service
   * @example
  // If we have registered service Foo previously

  class Foo {
        public getFoo() {
            return 'foo';
        }
  }

  // we can get an instance of Foo
  const foo = container.get(Foo);
  foo.getFoo() // returns 'foo'

   */
  public get<T>(service: Newable<T>): T;
}
