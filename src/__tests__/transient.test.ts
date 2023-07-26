import { Container, Scope } from '../';

describe('Transient scope', () => {
  abstract class AbstractFoo {
    abstract getFoo(): string;
    abstract myState: string;
  }

  class Foo extends AbstractFoo {
    public myState = 'Initial value in Foo';
    public getFoo() {
      return 'Second foo';
    }
  }

  it('should get transient in the parent container', () => {
    const container = new Container();
    container.bindAsDynamic(Foo, () => new Foo(), { scope: Scope.transient });
    const secondFoo1 = container.get(Foo);
    secondFoo1.myState = 'Change in instance 1';
    const secondFoo2 = container.get(Foo);
    expect(secondFoo1).not.toBe(secondFoo2);
    expect(secondFoo2.myState).toBe('Initial value in Foo');
  });

  it('should get transient in the parent container when the request scope is selected', () => {
    const container = new Container();
    container.bindAsDynamic(Foo, () => new Foo(), { scope: 'request' });
    const secondFoo1 = container.get(Foo);
    secondFoo1.myState = 'Change in instance 1';
    const secondFoo2 = container.get(Foo);
    expect(secondFoo1).not.toBe(secondFoo2);
    expect(secondFoo2.myState).toBe('Initial value in Foo');
  });

  it('should get transient in the child container bounded in the parent container', () => {
    const container = new Container();
    container.bindAsDynamic(Foo, () => new Foo(), { scope: 'transient' });
    const childContainer = container.createChild();
    const secondFoo1 = childContainer.get(Foo);
    secondFoo1.myState = 'Change in instance 1';
    const secondFoo2 = childContainer.get(Foo);
    expect(secondFoo1).not.toBe(secondFoo2);
    expect(secondFoo2.myState).toBe('Initial value in Foo');
  });

  it('should fail to get transient in the child container created before binding in the parent container', () => {
    const container = new Container();

    // 1. create childContainer
    const childContainer = container.createChild();

    // 2. bind to parent container
    container.bindAsDynamic(Foo, () => new Foo(), { scope: 'transient' });
    expect(() => childContainer.get(Foo)).toThrow('Missing module with service name Foo');
  });
});
