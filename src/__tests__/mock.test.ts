import { Container } from '../';

describe('Mock', () => {
  class TestRepository {
    public getAll() {
      return [1, 2, 3];
    }
  }

  class TestHelper {
    constructor(private readonly testRepository: TestRepository) {}

    public getAllAndPush(n: number) {
      const getAll = this.testRepository.getAll();
      getAll.push(n);
      return getAll;
    }
  }

  class TestService {
    constructor(private readonly testRepository: TestRepository, private readonly testHelper: TestHelper) {}
    public getTestData() {
      const getAllData = this.testRepository.getAll();

      if (!getAllData) {
        throw new Error("Missing 'getAllData' from the repository");
      }

      const dataFromHelper = this.testHelper.getAllAndPush(4);
      return dataFromHelper;
    }
  }

  class TestController {
    constructor(private readonly testService: TestService) {}
    public getTestData() {
      return this.testService.getTestData();
    }
  }

  class MockTestHelper {
    public getAllAndPush(n: number) {
      return [1];
    }
  }

  const container = new Container();
  container
    .bindAsConstant(TestRepository, new TestRepository())
    .bindAsDynamic(TestHelper, (c) => new TestHelper(c.get(TestRepository)))
    .bindAsDynamic(TestService, (c) => new TestService(c.get(TestRepository), c.get(TestHelper)))
    .bindAsDynamic(TestController, (c) => new TestController(c.get(TestService)));

  beforeEach(() => {
    container.snapshot();
  });

  afterEach(() => {
    container.restore();
  });

  it('should get mocked singletons bound as dynamic dependencies from the parent container', () => {
    container.mock(TestHelper, new MockTestHelper());
    const testControllerWithMockedTestHelper = container.get(TestController);
    expect(testControllerWithMockedTestHelper.getTestData()).toEqual([1]);
  });

  it('should get mocked singletons bound as dynamic dependencies from the child container', () => {
    container.mock(TestHelper, new MockTestHelper());
    const childContainer = container.createChild();
    const testControllerWithMockedTestHelper = childContainer.get(TestController);
    expect(testControllerWithMockedTestHelper.getTestData()).toEqual([1]);
  });

  it('should get original singletons bound as dynamic dependencies from the parent container', () => {
    const testController = container.get(TestController);
    const data = testController.getTestData();
    expect(data).toEqual([1, 2, 3, 4]);
  });

  it('should get original singletons bound as dynamic dependencies from the child container', () => {
    const childContainer = container.createChild();
    const testController = childContainer.get(TestController);
    const data = testController.getTestData();
    expect(data).toEqual([1, 2, 3, 4]);
  });

  it('should get mocked singletons bound as constant dependencies from the parent container', () => {
    container.mock(TestRepository, { getAll: () => [5, 6, 7] });

    const testControllerWithMockedTestRepository = container.get(TestController);
    expect(testControllerWithMockedTestRepository.getTestData()).toEqual([5, 6, 7, 4]);

    const mockedTestRepository = container.get(TestRepository);
    expect(mockedTestRepository.getAll()).toEqual([5, 6, 7]);
  });

  it('should get mocked singletons bound as constant dependencies from the child container', () => {
    container.mock(TestRepository, { getAll: () => [5, 6, 7] });
    const childContainer = container.createChild();
    const testControllerWithMockedTestRepository = childContainer.get(TestController);
    expect(testControllerWithMockedTestRepository.getTestData()).toEqual([5, 6, 7, 4]);

    const mockedTestRepository = childContainer.get(TestRepository);
    expect(mockedTestRepository.getAll()).toEqual([5, 6, 7]);
  });

  it('should mock an instance from the parent container before registering it', () => {
    class Foo {
      public foo() {
        return 'Foo';
      }
    }
    container.mock(Foo, new Foo());
    const foo = container.get(Foo);
    expect(foo.foo()).toBe('Foo');
  });

  it('should mock a service in the parent container when it is registered in the child container after mock binding', () => {
    class Foo {
      public foo() {
        return 'Foo';
      }
    }

    class MockedFoo {
      public foo() {
        return 'Mocked Foo';
      }
    }

    container.mock(Foo, new MockedFoo());
    const childContainer = container.createChild();
    childContainer.bindAsDynamic(Foo, () => new Foo(), { scope: 'transient' });
    const mockedFoo = container.get(Foo);
    expect(mockedFoo.foo()).toBe('Mocked Foo');
  });
});

describe('Snapshot and Restore', () => {
  class Foo {
    public foo() {
      return 'Foo';
    }
  }

  class MockedFoo implements Foo {
    public foo() {
      return 'Mocked Foo';
    }
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bindAsDynamic(Foo, () => new Foo());
  });

  it('should throw an error if we use mock before calling snapshot or after calling restore', () => {
    expect(() => container.mock(Foo, {})).toThrow("Must execute method 'snapshot()' before using mock");
  });

  it('should throw an error if we call restore on the child container', () => {
    const childContainer = container.createChild();
    expect(() => childContainer.restore()).toThrow(
      "Not available to restore to defaults by calling the method 'restore' from the child container",
    );
  });

  it('should throw an error if we call snapshot on the child container', () => {
    const childContainer = container.createChild();
    expect(() => childContainer.snapshot()).toThrow(
      "Not available to backup container data by calling the method 'snapshot' from the child container",
    );
  });

  it('should throw an error if we consecutively call the method snapshot', () => {
    container.snapshot();
    expect(() => container.snapshot()).toThrow("Consecutive calls on method 'snapshot' are forbidden");
  });

  it('should throw an error if we consecutively call the method restore', () => {
    container.snapshot();
    container.restore();
    expect(() => container.restore()).toThrow("Consecutive calls on method 'restore' are forbidden");
  });

  it('should snapshot, mock and restore in happy flow', () => {
    container.snapshot();

    container.mock(Foo, new MockedFoo());
    const mockedFoo = container.get(Foo);
    expect(mockedFoo.foo()).toBe('Mocked Foo');

    container.restore();
    const foo = container.get(Foo);
    expect(foo.foo()).toBe('Foo');
  });
});

describe('Clear mocks', () => {
  class Foo {
    public foo() {
      return 'Foo';
    }
  }

  class MockedFoo implements Foo {
    public foo() {
      return 'Mocked Foo';
    }
  }

  let container: Container;

  beforeEach(() => {
    container = new Container();
    container.bindAsDynamic(Foo, () => new Foo());
  });

  it(`should throw an error if we call 'clearMocks' before calling snapshot or after calling restore`, () => {
    expect(() => container.clearMocks()).toThrow(
      "Not available to call method 'clearMocks' before calling 'snapshot' or after calling 'restore'",
    );
  });

  it("should throw an error if we call 'clearMocks' on the child container", () => {
    const childContainer = container.createChild();
    expect(() => childContainer.clearMocks()).toThrow(
      "Not available to restore to defaults by calling the method 'clearMocks' from the child container",
    );
  });

  it('should clear mocks', () => {
    container.snapshot();

    container.mock(Foo, new MockedFoo());
    const mockedFoo = container.get(Foo);
    expect(mockedFoo.foo()).toBe('Mocked Foo');
    container.clearMocks();
    const foo = container.get(Foo);
    expect(foo.foo()).toBe('Foo');

    container.restore();
  });
});
