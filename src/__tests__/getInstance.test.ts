import { Container } from '../';
describe('Get Instance', () => {
  class Foo {
    public getFoo() {
      return 'foo';
    }
  }

  class Bar {
    constructor(private readonly foo: Foo) {}
    public getFooFromDependency() {
      return this.foo.getFoo();
    }
  }

  it('fails to get an instance from the parent container if it is bound in the child container', () => {
    const container = new Container();

    container.bindAsConstant(Foo, new Foo());
    const childContainer = container.createChild();
    childContainer.bindAsDynamic(Bar, (c) => new Bar(c.get(Foo)), { scope: 'request' });
    const bar = childContainer.get(Bar);
    expect(bar.getFooFromDependency()).toBe('foo');
    expect(() => container.get(Bar)).toThrow('Missing module with class name Bar');
  });

  it('fails to get an instance from the parent container before registering it', () => {
    const container = new Container();
    expect(() => container.get(Foo)).toThrow('Missing injected value');
  });
});
