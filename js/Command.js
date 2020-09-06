
var Command = class Command {
  constructor(forward, backward, ...args){
    this.arguments = args;
    this.result = null;
    this.forward = forward;
    this.backward = backward;
    this._done = false;
  }

  get done(){
    return this._done;
  }

  do(){
    this.result = this.forward(this.arguments);
    this._done = true;
  }

  undo(){
    if(!this.done){
      return;
    }
    this.backward(this.result);
    this._done = false;
  }
}

var Log = class Log {
  constructor(){
    this.list = []
  }

  add(command, direction=true){
    this.list.push({
      'command': command, 
      'direction': direction
    })
  }
}

var History = class History {
  constructor(){
    this.log = new Log();
    this.stack = [];
    this.future = [];
    this.current = null;
  }

  do(command){
    this.log.add(command);
    this.stack.push(command);
    command.do();
    this.current = command;
  }

  undo(){
    try{
      this.current = this.stack[this.stack.length -1];
      this.log.add(this.current, false);
      this.current.undo();
    }catch(error){
      console.error(error);
      this.current = null;
    }
  }

  redo(){
    if(!this.current){
      return;
    }

    this.current.do(...this.current.arguments)
  }
}

export default {
  'Command': Command,
  'History': History
}