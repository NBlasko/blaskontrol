import { Container } from '../';

describe('Transient scope', () => {
  abstract class AbstractFoo {
    abstract getFoo(): string;
    abstract myState: string;
  }

  class FirstFoo extends AbstractFoo {
    public myState = 'Initial value in FirstFoo';
    public getFoo() {
      return 'Second foo';
    }
  }

  it('should get transient in the parent container', () => {
    const container = new Container();
    container.bindAsDynamic(FirstFoo, () => new FirstFoo(), { scope: 'transient' });
    const secondFoo1 = container.get(FirstFoo);
    secondFoo1.myState = 'Change in instance 1';
    const secondFoo2 = container.get(FirstFoo);
    expect(secondFoo1).not.toBe(secondFoo2);
    expect(secondFoo2.myState).toBe('Initial value in FirstFoo');
  });

  it('should get transient in the parent container when the request scope is selected', () => {
    const container = new Container();
    container.bindAsDynamic(FirstFoo, () => new FirstFoo(), { scope: 'request' });
    const secondFoo1 = container.get(FirstFoo);
    secondFoo1.myState = 'Change in instance 1';
    const secondFoo2 = container.get(FirstFoo);
    expect(secondFoo1).not.toBe(secondFoo2);
    expect(secondFoo2.myState).toBe('Initial value in FirstFoo');
  });

  it('should get transient in the child container bonded in the parent container', () => {
    const container = new Container();
    container.bindAsDynamic(FirstFoo, () => new FirstFoo(), { scope: 'transient' });
    const childContainer = container.createChild();
    const secondFoo1 = childContainer.get(FirstFoo);
    secondFoo1.myState = 'Change in instance 1';
    const secondFoo2 = childContainer.get(FirstFoo);
    expect(secondFoo1).not.toBe(secondFoo2);
    expect(secondFoo2.myState).toBe('Initial value in FirstFoo');
  });

  it('should fail to get transient in the child container created before binding in the parent container', () => {
    const container = new Container();

    // 1. create childContainer
    const childContainer = container.createChild();

    // 2. bind to parent container
    container.bindAsDynamic(FirstFoo, () => new FirstFoo(), { scope: 'transient' });
    expect(() => childContainer.get(FirstFoo)).toThrow('Missing module with class name FirstFoo');
  });
});
