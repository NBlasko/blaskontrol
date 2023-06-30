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

  it('should throw an error if we call restore on the child container', () => {
    const childContainer = container.createChild();
    expect(() => childContainer.restore()).toThrow(
      "Not available to restore to defaults by calling the method 'restore' from the child container",
    );
  });

  it('should throw an error if we use mock before calling snapshot or after calling restore', () => {
    container.restore();
    expect(() => container.mock(TestRepository, {})).toThrow("Must execute method 'snapshot()' before using mock");
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

  it('should mock a class in the parent container when it is registered in the child container after mock binding', () => {
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
