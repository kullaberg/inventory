//@ts-check

export class person {
  constructor(args) {
    for (const key in args) {
      if (args.hasOwnProperty(key)) {
        this[key] = args[key];
      }
    }
  }
}
