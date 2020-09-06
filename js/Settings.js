import { create, all } from 'mathjs'
var math = create(all, {})

var Settings = class Settings{
  constructor(){
    this._attraction = math.matrix(Array(3).fill(5e-5));
    this._repulsion = math.matrix(Array(3).fill(3e-5));
    this._epsilon = math.matrix(Array(3).fill(2e-3));
    this._inner_distance = math.matrix(Array(3).fill(0.1));
    this._friction = math.matrix(Array(3).fill(0.35));
    this._gravity = math.matrix(Array(3).fill(10.0));
    this._dampening = 0.25;
    this._theta = 0.20;
  }

  get settings(){
    return [
      'attraction',
      'repulsion',
      'epsilon',
      'inner_distance',
      'friction',
      'dampening',
      'theta'
    ];
  }

  set attraction(val){
    this._attraction._data = Array(3).fill(val);
  }

  get attraction(){
    return this._attraction._data[0]
  }

  set repulsion(val){
    this._repulsion._data = Array(3).fill(val);
  }

  get repulsion(){
    return this._repulsion._data[0]
  }

  set epsilon(val){
    this._epsilon._data = Array(3).fill(val);
  }

  get epsilon(){
    return this._epsilon._data[0]
  }

  set inner_distance(val){
    this._inner_distance._data = Array(3).fill(val);
  }

  get inner_distance(){
    return this._inner_distance._data[0]
  }

  set friction(val){
    this._friction._data = Array(3).fill(val)
  }

  get friction(){
    return this._friction._data[0]
  }

  set gravity(val){
    this._gravity._data = Array(3).fill(val)
  }

  get gravity(){
    return this._gravity._data[0];
  }

  set dampening(val){
    this._dampening = val;
  }

  get dampening(){
    return this._dampening;
  }
  
  set theta(val){
    this._theta = val;
  }

  get theta(){
    return this._theta;
  }

  toJSON(){
    var object = {};
    var settings = this.settings;
    for(var setting of settings){
      object[setting] = Reflect.get(this, setting);
    }

    return object;
  }
}

export default Settings;