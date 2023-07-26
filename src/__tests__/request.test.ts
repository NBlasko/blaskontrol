import { Container } from '../';

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

describe('Request scope', () => {
  class TestContext {
    myTestData: number[] = [];
  }

  class TestRepository {
    public getAll() {
      return [1, 2, 3];
    }
  }

  class TestHelper {
    constructor(private readonly testContext: TestContext) {}

    public setTestData(n: number) {
      this.testContext.myTestData.push(n);
    }
  }

  class TestService {
    constructor(private readonly testRepository: TestRepository, private readonly testContext: TestContext) {}
    public getTestData() {
      const myNumberFromContext = this.testContext.myTestData[0];

      if (!myNumberFromContext) {
        throw new Error('Missing myNumberFromContext');
      }
      const dataFromRepository = this.testRepository.getAll();
      dataFromRepository.push(myNumberFromContext);
      return dataFromRepository;
    }
  }

  class TestController {
    constructor(private readonly testService: TestService, private readonly testHelper: TestHelper) {}
    public getTestData(n: number) {
      this.testHelper.setTestData(n);
      return this.testService.getTestData();
    }
  }

  class Foo {
    public myState = 'Initial value in Foo';
    public getFoo() {
      return 'Foo';
    }
  }

  class Bar {
    constructor(private readonly foo: Foo) {}

    public getFooFromFoo() {
      return this.foo.getFoo();
    }

    public readFromFooState() {
      return this.foo.myState;
    }

    public writeToFooState(newState: string) {
      this.foo.myState = newState;
    }
  }

  it('should execute full request flow with Context service bound in the child container', () => {
    const requestScope = { scope: 'request' } as const;
    const container = new Container();
    container
      .bindAsDynamic(TestRepository, () => new TestRepository(), requestScope)
      .bindAsDynamic(TestHelper, (c) => new TestHelper(c.get(TestContext)), requestScope)
      .bindAsDynamic(TestService, (c) => new TestService(c.get(TestRepository), c.get(TestContext)), requestScope)
      .bindAsDynamic(TestController, (c) => new TestController(c.get(TestService), c.get(TestHelper)), requestScope);

    // Request1 and request2 are 'parallel'
    const childContainer1 = container.createChild();
    childContainer1.bindAsDynamic(TestContext, () => new TestContext(), requestScope);
    const childContainer2 = container.createChild();
    childContainer2.bindAsDynamic(TestContext, () => new TestContext(), requestScope);

    const controller1 = childContainer1.get(TestController);
    expect(controller1.getTestData(5)).toEqual([1, 2, 3, 5]);

    const controller2 = childContainer2.get(TestController);
    expect(controller2.getTestData(6)).toEqual([1, 2, 3, 6]);

    // Request3 starts after request1 and request2 are finished
    const childContainer3 = container.createChild();
    childContainer3.bindAsDynamic(TestContext, () => new TestContext(), requestScope);
    const controller3 = childContainer3.get(TestController);
    expect(controller3.getTestData(7)).toEqual([1, 2, 3, 7]);
  });

  it('should execute full request flow with Context service bound in the parent container', () => {
    const requestScope = { scope: 'request' } as const;
    const container = new Container();
    container
      .bindAsDynamic(TestRepository, () => new TestRepository(), requestScope)
      .bindAsDynamic(TestHelper, (c) => new TestHelper(c.get(TestContext)), requestScope)
      .bindAsDynamic(TestService, (c) => new TestService(c.get(TestRepository), c.get(TestContext)), requestScope)
      .bindAsDynamic(TestController, (c) => new TestController(c.get(TestService), c.get(TestHelper)), requestScope)
      .bindAsDynamic(TestContext, () => new TestContext(), requestScope);

    // Request1 and request2 are 'parallel'
    const childContainer1 = container.createChild();
    const childContainer2 = container.createChild();

    const controller1 = childContainer1.get(TestController);
    expect(controller1.getTestData(5)).toEqual([1, 2, 3, 5]);

    const controller2 = childContainer2.get(TestController);
    expect(controller2.getTestData(6)).toEqual([1, 2, 3, 6]);

    // Request3 starts after request1 and request2 are finished
    const childContainer3 = container.createChild();
    childContainer3.bindAsDynamic(TestContext, () => new TestContext(), requestScope);
    const controller3 = childContainer3.get(TestController);
    expect(controller3.getTestData(7)).toEqual([1, 2, 3, 7]);
  });

  it('should get a request scoped service in the child container', () => {
    const container = new Container();
    container.bindAsDynamic(Foo, () => new Foo(), { scope: 'request' });
    container.bindAsDynamic(Bar, (c) => new Bar(c.get(Foo)), { scope: 'request' });
    const childContainer1 = container.createChild();

    // childContainer2 was created before getting the bar instance
    const childContainer2 = container.createChild();

    const bar1FromChild1 = childContainer1.get(Bar);
    bar1FromChild1.writeToFooState('New state from bar1');
    const bar2FromChild1 = childContainer1.get(Bar);
    expect(bar2FromChild1.readFromFooState()).toBe('New state from bar1');
    expect(bar1FromChild1).toBe(bar2FromChild1);

    const barFromChild2 = childContainer2.get(Bar);
    expect(bar1FromChild1).not.toBe(barFromChild2);
    expect(barFromChild2.readFromFooState()).toBe('Initial value in Foo');

    // childContainer3 was created after getting the bar instance
    const childContainer3 = container.createChild();
    const barFromChild3 = childContainer3.get(Bar);
    expect(bar1FromChild1).not.toBe(barFromChild3);
    expect(barFromChild3.readFromFooState()).toBe('Initial value in Foo');
  });
});
