# blaskontrol

![Coveralls branch](https://img.shields.io/coverallsCoverage/github/NBlasko/blaskontrol) ![npm](https://img.shields.io/npm/dt/blaskontrol) ![Known Vulnerabilities](https://snyk.io/test/github/NBlasko/blaskontrol/badge.svg)

## Introduction

In modern application development, software design principles that promote flexibility, maintainability, and testability are essential for building robust and scalable applications. One such powerful principle is "Dependency Injection" (DI), a design pattern that plays a crucial role in structuring code and managing dependencies.

In traditional programming, classes often create and manage their dependencies directly, leading to tight coupling between components. This tight coupling makes it challenging to modify or extend code without affecting other parts of the application, resulting in a lack of flexibility and code that is difficult to maintain.

In contrast, DI shifts the responsibility of creating and managing dependencies to an external entity, known as a "Container" or "DI Container." This decouples the components from their dependencies, allowing them to focus solely on their core functionality. The DI Container takes on the responsibility of resolving and providing instances of required services, based on their registered bindings.

Here is where ```blaskontrol``` comes into play. As a lightweight and easy-to-use DI Container for TypeScript and JavaScript applications, ```blaskontrol``` simplifies the process of managing dependencies and implementing dependency injection in your project. The best part is, you don't need to rely on experimental features such as emitDecoratorMetadata or use the reflect-metadata library, making it a clean and efficient solution for your applications.

By leveraging ```blaskontrol```, you can seamlessly register and resolve services, creating a well-structured and modular architecture without the need for manual instance management.

With ```blaskontrol```, you can easily achieve:

* Loose Coupling: Components within your application are no longer tightly coupled to their dependencies, making it simpler to modify and extend code without unexpected side effects.

* Testability: Writing unit tests becomes more straightforward since you can easily mock and replace dependencies during testing, isolating the behavior of individual components.

* Code Organization: The DI pattern encourages cleaner and more organized code, with each component focused on its specific task, leading to better maintainability.

* Scalability: As your application grows, ```blaskontrol``` allows you to manage the increasing complexity of dependencies with minimal effort, ensuring scalability and maintainability.

In the following documentation, we will explore how to use ```blaskontrol``` to register services, resolve dependencies, and take advantage of the different injection scopes offered. We will also cover advanced features, testing strategies, and practical use cases, empowering you to harness the full potential of ```blaskontrol``` in building exceptional TypeScript and JavaScript applications. Let's dive in and discover how ```blaskontrol``` facilitates a more organized and flexible approach to dependency management with dependency injection.

## Installation

Install with npm
```npm install blaskontrol```

Or yarn
```yarn add blaskontrol```

## Usage

### Import

```typeScript
// ES5 example
const Container = require('blaskontrol').Container;

// ES6+ example
import { Container } from 'blaskontrol';
```

### Register services

To utilize the dependency injection capabilities of `blaskontrol`, you have two methods at your disposal for registering services: `bindAsConstant` and `bindAsDynamic`.

#### bindAsConstant

The `bindAsConstant` method allows you to register singleton services. It takes two parameters: the service class you want to resolve and an instance of that service. Once registered, `bindAsConstant` ensures that a single instance of the service is shared throughout the application.

```typeScript
class Foo {
  constructor() {
    console.log('Foo is instantiated');
  }

  public getFoo() {
    return 'foo';
  }
}

const container = new Container();
container.bindAsConstant(Foo, new Foo());
```

In this example, when new Foo() is called during registration, an instance of the Foo service is created, and the output 'Foo is instantiated' will be displayed. Subsequent calls to resolve the Foo service will return the same instance.

#### bindAsDynamic

The `bindAsDynamic` method provides more flexibility compared to `bindAsConstant`. It requires three parameters: the service class you want to resolve, a callback function (handler), and an optional configuration object.

```typeScript
container.bindAsDynamic(Foo, () => new Foo());
```

Similar to `bindAsConstant`, this example will resolve the Foo service. However, there's a subtle difference: `bindAsDynamic` uses lazy instantiation. The service instance is not created during registration, but rather when the service is first requested using the get method. Subsequent calls to `container.get(Foo)` will return the same instance.

To control the instantiation behavior, you can use the optional configuration object. For instance, if you want to ensure that each `container.get(Foo)` call returns a fresh instance, set the scope option to 'transient'.

```typeScript
container.bindAsDynamic(Foo, () => new Foo(), { scope: 'transient' });
```

The available options for the scope are 'transient', 'request', and 'singleton', with 'singleton' being the default scope.

#### Advanced Handler Strategies

The second parameter of `bindAsDynamic` is a callback function (handler) that receives a reference to the container instance as its argument. This handler allows you to define more complex strategies for service instantiation.

For example, you can create an instance of a service that depends on other services from the container:

```typeScript
class Bar {
  constructor(private readonly foo: Foo) {}

  public getFooFromFoo() {
    return this.foo.getFoo();
  }
}

container.bindAsDynamic(Bar, (c) => new Bar(c.get(Foo)));
```

In this case, we are using the handler to describe how to create an instance of the Bar service that depends on the Foo service.

#### Note on Using Containers

When defining handlers with `bindAsDynamic`, it's crucial not to use a global (parent) container to resolve dependencies. Instead, use the first argument in the handler, as it references the correct container at runtime. This ensures that your handlers work correctly, especially when working with multiple instances of containers, such as child containers.

```typeScript
// Incorrect: Using the global / parent container
container.bindAsDynamic(Bar, () => new Bar(container.get(Foo)));

// Correct: Using the first argument in the handler
container.bindAsDynamic(Bar, (c) => new Bar(c.get(Foo)));
```

By following this practice, you can confidently utilize child containers and maintain isolation between containers when resolving dependencies within handlers.

### Get services

```typeScript
const foo = container.get(Foo);
foo.getFoo() // returns 'foo'

```

### Mock services

Mocking services requires running the `snapshot` method before mocking a class and the `restore` after using the mocked version of a class instance.

Method `snapshot` caches all dependencies and service factories. It sets the container in a "testable state session." After calling the method `snapshot`, we can mock dependencies.

When we finish mocking and testing using provided mocks in the container, we can call a method `restore`. Method `restore` will clear all mocks and return the container to its original state (the state in which the container was before we triggered the `snapshot` method).

Presume we want to mock the `Foo` class with `MockFoo`:

```typeScript

class MockFoo {
  public getFoo() {
    return 'mockedFoo';
  }
}

container.snapshot(); // A good place to run it is in the test framework lifecycle 'before', 'beforeAll', or 'beforeEach'.

container.mock(Foo, new MockFoo());
const foo = container.get(Foo);
foo.getFoo() // returns 'mockedFoo'

container.restore(); // A good place to run it is in the test framework lifecycle 'after', 'afterAll', or 'afterEach'.
```

### Debugging

To get additional logs from the Container instance, you will need to provide debug callback function in the Container parameter. Example:

```typeScript
const debug = console.debug; // or any other function with the type (message: string) => void
const container = new Container({ debug });
```

### Injection scopes

One fundamental aspect of a Dependency Injection Container is the concept of "injection scopes". Scopes define how instances of classes are created and shared within the application. Each scope serves a distinct purpose, influencing the lifecycle and availability of instances when requested by different consumers.

In this documentation, we will explore three common injection scopes: Singleton, Request, and Transient. Understanding these scopes will empower you to make informed decisions when registering and resolving your services, ultimately leading to a well-structured and efficient application.

Now, let's dive into each injection scope and gain insights into when and how to leverage them effectively in your dependency injection module.

* Singleton: The service is created as a single instance that is shared throughout the application. When consumers request this service, they will always receive the same instance. The singleton instance is created either during application startup, using the `bindAsConstant` method, or the first time it's resolved, using the `bindAsDynamic` method. This instance remains available until the application shuts down. The singleton scope is ideal for maintaining a global state or ensuring consistent access to the same instance for all consumers.

* Request: A new instance of the service is created for each individual request. When a consumer requests this service, a fresh instance is provided, which is specific to that particular request. Once the request is processed and completed, the instance is disposed of. This scope is beneficial when you need to isolate data or state between different requests, ensuring that each request has its own dedicated instance.

* Transient: Each consumer that requires this service will receive a new, independent instance. Transient instances are not shared across consumers, meaning that each consumer gets its own unique instance. This scope is useful when you want to maintain complete separation and independence between consumers, preventing any unintended sharing of state or data.

We can set scopes in the second parameter of the method `bindAsDynamic`.

```typeScript
// lowercase transient, request or singleton
container.bindAsDynamic(Foo, () => new Foo(), { scope: 'transient' });

// or import scope values
import { Scope } from 'blaskontrol';
container.bindAsDynamic(Foo, () => new Foo(), { scope: Scope.transient });
```

> **Notice:** Method `bindAsConstant` will set the injection scope to singleton.
Singletons must be bound in the parent container. That way, we are solving potential bugs of registering singletons from a child container that captures some preferably consumer-isolated data. More about child containers in the next section.

### Child Containers

Child Containers are containers that should live during the request. They can be handy if, during the request lifetime, we need to register additional services that should not exist in the parent container or should rebind existing services in the parent container but not change them on the parent level. Also, child containers provide isolation between requests, as they are holding isolated services with 'request' and 'transient' injection scope.

In child containers, you bind only request or transient scoped services.

Example:

```typeScript
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

// or rebind Helper service with new ChildHelper service
childContainer.bindAsDynamic(Helper, () => new ChildHelper(), { scope: 'transient' });

// Notice, if we try to rebind Helper in a child container with different scope, we will ignore that change
childContainer.bindAsDynamic(Helper, () => new ChildHelper(), { scope: 'request' }); // will stay transient scope from already created

```

> **Notice:** If we set the request scope in the parent container and try to resolve this service in the parent container, it will fall back to the transient injection scope. The parent container exists during the lifetime of the application. If we allow it to create a request scope service, based on his lifetime, services will act as singletons.
