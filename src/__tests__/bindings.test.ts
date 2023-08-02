import { Container } from '../';

describe('Bindings', () => {
  abstract class AbstractFoo {
    abstract getFoo(): string;
  }

  class FirstFoo extends AbstractFoo {
    public getFoo() {
      return 'First foo';
    }
  }

  class OtherFirstFoo implements FirstFoo {
    public getFoo() {
      return 'Other first foo';
    }
  }

  class SecondFoo extends AbstractFoo {
    public getFoo() {
      return 'Second foo';
    }
  }

  class Bar {
    constructor(private readonly foo: AbstractFoo) {}
    public getFooFromDependency() {
      return this.foo.getFoo();
    }
  }

  it('should bind different dependencies in independent child containers', () => {
    const container = new Container();
    container.bindAsConstant(FirstFoo, new FirstFoo());
    container.bindAsDynamic(SecondFoo, () => new SecondFoo());
    container.bindAsDynamic(OtherFirstFoo, () => new OtherFirstFoo());

    const childContainer1 = container.createChild();
    childContainer1.bindAsDynamic(Bar, (c) => new Bar(c.get(FirstFoo)), { scope: 'request' });

    const childContainer2 = container.createChild();
    childContainer2.bindAsDynamic(Bar, (c) => new Bar(c.get(SecondFoo)), { scope: 'transient' });

    const barWithFirstFoo = childContainer1.get(Bar);
    const barWithSecondFoo = childContainer2.get(Bar);

    expect(barWithFirstFoo.getFooFromDependency()).toBe('First foo');
    expect(barWithSecondFoo.getFooFromDependency()).toBe('Second foo');
  });

  it('It should get different instances from parent and child when we rebind service in the child container.', () => {
    const container = new Container();
    container.bindAsConstant(FirstFoo, new FirstFoo());
    container.bindAsDynamic(SecondFoo, () => new SecondFoo());
    container.bindAsDynamic(OtherFirstFoo, () => new OtherFirstFoo());
    container.bindAsDynamic(Bar, (c) => new Bar(c.get(FirstFoo)), { scope: 'request' });

    const childContainer = container.createChild();
    childContainer.bindAsDynamic(Bar, (c) => new Bar(c.get(SecondFoo)), { scope: 'transient' });

    const barWithFirstFoo = container.get(Bar);
    const barWithSecondFoo = childContainer.get(Bar);

    expect(barWithFirstFoo.getFooFromDependency()).toBe('First foo');
    expect(barWithSecondFoo.getFooFromDependency()).toBe('Second foo');
  });

  it('should chain the bindings of services', () => {
    const container = new Container();

    container
      .bindAsConstant(FirstFoo, new FirstFoo())
      .bindAsDynamic(SecondFoo, () => new SecondFoo())
      .bindAsDynamic(OtherFirstFoo, () => new OtherFirstFoo())
      .bindAsDynamic(Bar, (c) => new Bar(c.get(FirstFoo)), { scope: 'request' });

    const barWithFirstFoo = container.get(Bar);
    expect(barWithFirstFoo.getFooFromDependency()).toBe('First foo');

    const firstFoo = container.get(FirstFoo);
    expect(firstFoo.getFoo()).toBe('First foo');

    const secondFoo = container.get(SecondFoo);
    expect(secondFoo.getFoo()).toBe('Second foo');
  });

  it('should bind the same service with independent containers without conflict', () => {
    const bindingSameServiceToDifferentContainers = () => {
      const container1 = new Container();
      container1.bindAsConstant(FirstFoo, new FirstFoo());

      const container2 = new Container();
      container2.bindAsConstant(FirstFoo, new FirstFoo());
    };

    expect(bindingSameServiceToDifferentContainers).not.toThrow();
  });

  it('should fail with bindAsConstant/Dynamic called two times on the same service on the parent container', () => {
    const container = new Container();

    const bindAsConstantTwoTimesOnParent = () => {
      container.bindAsConstant(FirstFoo, new FirstFoo());
      container.bindAsConstant(FirstFoo, new FirstFoo());
    };

    const bindAsDynamicTwoTimesOnParent = () => {
      container.bindAsDynamic(FirstFoo, () => new FirstFoo());
      container.bindAsDynamic(FirstFoo, () => new FirstFoo());
    };

    const bindTwoTimesOnParent = () => {
      container.bindAsConstant(FirstFoo, new FirstFoo());
      container.bindAsDynamic(FirstFoo, () => new FirstFoo());
    };

    const errorMessage = 'Service FirstFoo is already registered';
    expect(bindAsConstantTwoTimesOnParent).toThrow(errorMessage);
    expect(bindAsDynamicTwoTimesOnParent).toThrow(errorMessage);
    expect(bindTwoTimesOnParent).toThrow(errorMessage);
  });

  it("should work with 'bindAsDynamic' called two times on the same service on the child container as 'request' and 'transient' scoped", () => {
    const container = new Container();
    const childContainer = container.createChild();

    const registerDynamicTwoTimesOnChild = () => {
      childContainer.bindAsDynamic(FirstFoo, () => new FirstFoo(), { scope: 'request' });
      childContainer.bindAsDynamic(FirstFoo, () => new FirstFoo(), { scope: 'transient' });
    };

    expect(registerDynamicTwoTimesOnChild).not.toThrow();
  });

  it('should bind and get an anonymous function - not an officially supported feature', () => {
    const container = new Container();
    const anonymousFunction = () => 'Hello';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    container.bindAsConstant((() => 'Hello' as unknown) as any, anonymousFunction);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anonymousFunctionFromContainer: any = container.get(anonymousFunction as any);
    expect(anonymousFunctionFromContainer()).toBe('Hello');
  });

  it('should bind and get an object - not an officially supported feature', () => {
    const container = new Container();
    const obj = { myKey: 'Hello' };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    container.bindAsConstant(obj as any, obj);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anonymousFunctionFromContainer: any = container.get(obj as any);
    expect(anonymousFunctionFromContainer.myKey).toBe('Hello');
  });
});
