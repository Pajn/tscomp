import 'reflect-metadata';
import absoluteLoad from 'absoluteLoad';

interface MyType {
  foo: number;
  bar: boolean;
  baz?: { n: number };
}

type MyObject = Pick<MyType, 'bar' | 'baz'>;

@annotation
class App {
  static foo: MyObject = { bar: true, baz: { n: 123 } };
  n = App.foo.baz!.n;
  @propertyDecorator
  decorated = 5;
  users = absoluteLoad();
}

function annotation(target: any) {
  target.annotated = true;
}

function propertyDecorator(target: any, key: string) {
  target.decoratedProperties = target.decoratedProperties || [];
  target.decoratedProperties.push(key);
}

export default App;
