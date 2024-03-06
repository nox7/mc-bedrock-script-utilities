/**
 * General Queue data structure
 */
export class Queue<T> {

    private Elements: {[key:number]: T} = {};
    private Head: number = 0;
    private Tail: number = 0;

    Enqueue(element: T): void {
      this.Elements[this.Tail] = element;
      this.Tail++;
    }

    EnqueueList(listOfElements: T[]): void {
      for (const element of listOfElements){
        this.Elements[this.Tail] = element;
        this.Tail++;
      }
    }

    Dequeue(): T {
      const item = this.Elements[this.Head];
      delete this.Elements[this.Head];
      this.Head++;
      return item;
    }

    DequeueChunk(size: number): T[] {
      const elements: T[] = [];
      for (let i = 0; i < size; i ++){
        if (this.IsEmpty){
          return elements;
        }

        elements.push(this.Dequeue());
      }

      return elements;
    }

    Peek(): T {
      return this.Elements[this.Head];
    }

    get Length(): number {
      return this.Tail - this.Head;
    }
    get IsEmpty(): boolean {
      return this.Length === 0;
    }
  }