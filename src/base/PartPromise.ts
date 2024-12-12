type PartResolveHandler<T> = (data: T) => void;
type ResolveHandler<T> = (allData: T[]) => void;

export class SSEPromise<T> {
  private handlers: { onPartResolve: PartResolveHandler<T>, onResolve: ResolveHandler<T> }[] = [];
  private isResolved: boolean = false;
  private dataBuffer: T[] = [];

  partResolve(data: T) {
    if (!this.isResolved) {
      this.dataBuffer.push(data);
      this.handlers.forEach(handler => handler.onPartResolve(data));
    }
  };

  resolve() {
    if (!this.isResolved) {
      this.isResolved = true;
      this.handlers.forEach(handler => handler.onResolve(this.dataBuffer));
    }
  };

  then(onPartResolve: PartResolveHandler<T>, onResolve: ResolveHandler<T>): this {
    this.handlers.push({ onPartResolve, onResolve });
    this.dataBuffer.forEach(data => onPartResolve(data));
    if (this.isResolved) {
      onResolve(this.dataBuffer);
    }
    return this;
  }
}
