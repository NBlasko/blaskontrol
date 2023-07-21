import { Container } from '../';

describe('Singleton scope', () => {
  abstract class AbstractFoo {
    abstract getFoo(): string;
    abstract myState: string;
  }

  class FirstFoo extends AbstractFoo {
    public myState = 'Initial value in FirstFoo';
    public getFoo() {
      return 'First foo';
    }
  }

  class SecondFoo extends AbstractFoo {
    public myState = 'Initial value in SecondFoo';
    public getFoo() {
      return 'Second foo';
    }
  }

  class Bar {
    constructor(private readonly firstFoo: FirstFoo) {}

    public getFooFromFirstFoo() {
      return this.firstFoo.getFoo();
    }

    public readFromFirstFooState() {
      return this.firstFoo.myState;
    }

    public writeToFirstFooState(newState: string) {
      this.firstFoo.myState = newState;
    }
  }

  it('should fail if we try to bind singleton in a child container', () => {
    const container = new Container();

    const childContainer = container.createChild();

    expect(() => childContainer.bindAsConstant(FirstFoo, new FirstFoo())).toThrow(
      'Singletons must be bound in the parent container',
    );

    expect(() => childContainer.bindAsDynamic(SecondFoo, () => new SecondFoo())).toThrow(
      'Singletons must be bound in the parent container',
    );
  });

  it("should return an instance of Container if we call 'bindAsConstant'", () => {
    const debug = jest.fn();
    const container = new Container({ debug });
    expect(container.bindAsConstant(FirstFoo, new FirstFoo()) instanceof Container).toBeTruthy();
  });

  it("should get a service with 'bindAsConstant' as a singleton from the parent container", () => {
    const debug = jest.fn();
    const container = new Container({ debug });
    container.bindAsConstant(FirstFoo, new FirstFoo());
    expect(debug).toHaveBeenCalledWith('Container registers service FirstFoo with id di1 as a singleton');

    debug.mockReset();
    container.get(FirstFoo);

    // If there are no calls, then cached dependencies successfully store the instance.
    expect(debug).not.toBeCalled();
  });

  it("It should get a service with 'bindAsDynamic' as a singleton from the parent container", () => {
    const debug = jest.fn();
    const container = new Container({ debug });
    container.bindAsDynamic(FirstFoo, () => new FirstFoo());
    expect(debug).toHaveBeenCalledWith('Parent container registers service FirstFoo with id di1 as a singleton scoped');

    debug.mockReset();

    // Resolving singleton
    container.get(FirstFoo);
    expect(debug).toHaveBeenCalledWith('Container resolved service FirstFoo with id di1 as a singleton');

    debug.mockReset();
    container.get(FirstFoo);

    // If there are no calls, then cached dependencies successfully store the instance.
    expect(debug).not.toHaveBeenCalled();
  });

  it("It should get a service with 'bindAsConstant' as a singleton from the child container", () => {
    const debug = jest.fn();
    const container = new Container({ debug });
    container.bindAsConstant(FirstFoo, new FirstFoo());
    const childContainer = container.createChild();
    expect(debug).toHaveBeenCalledWith('Container registers service FirstFoo with id di1 as a singleton');

    debug.mockReset();
    childContainer.get(FirstFoo);

    // If there are no calls, then cached dependencies successfully store the instance.
    expect(debug).not.toHaveBeenCalled();
  });

  it("It should get a service with 'bindAsDynamic' as a singleton from the child container", () => {
    const debug = jest.fn();
    const container = new Container({ debug });
    container.bindAsDynamic(FirstFoo, () => new FirstFoo());
    expect(debug).toHaveBeenCalledWith('Parent container registers service FirstFoo with id di1 as a singleton scoped');
    const childContainer = container.createChild();

    debug.mockReset();

    // Resolving singleton
    childContainer.get(FirstFoo);
    expect(debug).toHaveBeenCalledWith('Container resolved service FirstFoo with id di1 as a singleton');

    debug.mockReset();
    childContainer.get(FirstFoo);

    // If there are no calls, then cached dependencies successfully store the instance.
    expect(debug).not.toHaveBeenCalled();
  });

  it('should read the state in the parent container changed from the child container', () => {
    const container = new Container();
    container.bindAsDynamic(FirstFoo, () => new FirstFoo());
    const firstFooFromParent = container.get(FirstFoo);

    const childContainer = container.createChild();
    const firstFooFromChild = childContainer.get(FirstFoo);
    firstFooFromChild.myState = 'New value in FirstFoo changed form childContainer';
    expect(firstFooFromParent.myState).toBe('New value in FirstFoo changed form childContainer');
  });

  it('It should read the state in the child2 container changed from the child1 container', () => {
    const container = new Container();
    container.bindAsDynamic(FirstFoo, () => new FirstFoo());

    const childContainer1 = container.createChild();
    const childContainer2 = container.createChild();
    const firstFooFromChild1 = childContainer1.get(FirstFoo);
    const firstFooFromChild2 = childContainer2.get(FirstFoo);
    firstFooFromChild1.myState = 'New value in FirstFoo changed form childContainer1';
    expect(firstFooFromChild2.myState).toBe('New value in FirstFoo changed form childContainer1');
  });

  it('should get a singleton from the factory that depends on transient services in the parent container', () => {
    const container = new Container();
    container.bindAsDynamic(FirstFoo, () => new FirstFoo(), { scope: 'transient' });
    container.bindAsDynamic(Bar, (c) => new Bar(c.get(FirstFoo)));
    const firstFoo1 = container.get(FirstFoo);
    firstFoo1.myState = 'New state in transient service';

    // Bar is singleton, bar1 === bar2
    const bar1 = container.get(Bar);
    expect(bar1.readFromFirstFooState()).toBe('Initial value in FirstFoo');
    bar1.writeToFirstFooState('New state added from Bar singleton');
    expect(bar1.readFromFirstFooState()).toBe('New state added from Bar singleton');
    const bar2 = container.get(Bar);
    expect(bar2.readFromFirstFooState()).toBe('New state added from Bar singleton');
    expect(bar1).toBe(bar2);

    // No caching => transient service
    const firstFoo2 = container.get(FirstFoo);
    expect(firstFoo2.myState).toBe('Initial value in FirstFoo');
  });
});
