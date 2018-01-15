//@ts-check

export class item {
  constructor(args) {
    for (const key in args) {
      if (args.hasOwnProperty(key)) {
        this[key] = args[key];
      }
    }
  }
}
