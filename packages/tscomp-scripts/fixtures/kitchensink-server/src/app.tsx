export function main(feature: string) {
  switch (feature) {
    case "destructuring-and-await":
      import("./features/syntax/DestructuringAndAwait")
        .then(f => f.load())
        .then(output => console.log(JSON.stringify(output.users)));
      break;
    case "generators":
      import("./features/syntax/Generators").then(f =>
        console.log(JSON.stringify([...f.load(4)]))
      );
      break;
    case "linked-modules":
      import("./features/modules/LinkedModules").then(f =>
        console.log(JSON.stringify(f.default()))
      );
      break;
    case "object-spread":
      import("./features/syntax/ObjectSpread").then(f =>
        console.log(JSON.stringify(f.load({ age: 42 })))
      );
      break;
    case "rest-and-default":
      import("./features/syntax/RestAndDefault").then(f =>
        console.log(JSON.stringify(f.load()))
      );
      break;
    default:
      throw new Error(`Missing feature "${feature}"`);
  }
}
