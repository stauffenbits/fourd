import { create, all } from 'mathjs'
var math = create(all, {})

var ID = 1;

var BarnesHutNode3 = class BarnesHutNode3 {
  constructor(settings){
    this.settings = settings;
    this.inners = new Set();
    this.outers = new Map();
    this.center_sum = math.zeros(3);
    this.count = 0;
  }

  center(){
    this.center_sum = [...this.inners].reduce((prev, cur, i, all) => {
      return math.add(prev, cur.position)
    }, math.zeros(3));

    return math.divide(
      this.center_sum,
      parseFloat(this.count-1)
    )
  }

  insert(vertex){
    this.count++;

    if(this.inners.size == 0){
      this.place_inner(vertex);
    }else{
      var center = this.center();
      var dist = math.subtract(center, vertex.position);

      if(math.smaller(dist, this.settings.inner_distance)){
        this.place_inner(vertex);
      }else{
        this.place_outer(vertex);
      }
    }
  }

  estimate(v, forceFn){
    var f = math.zeros(3);
    if(this.inners.has(v)){
      for(var inner of this.inners){
        if(inner.id != v.id){
          var force = forceFn(v.position, inner.position, this.settings);
          f = math.add(f, force)
        }
      }
    }else{
      var c = this.center();
      f = math.multiply(
        math.add(f, forceFn(v.position, c, this.settings)),
        parseFloat(this.inners.size)
      );
    }

    for(var outer of this.outers){
      f = math.add(
        f,
        this.outers.get(outer).estimate(v, forceFn)
      )
    }

    return f;
  }

  size(){
    return this.count;
  }

  get_octant(pos){
    var c = this.center();

    var x = math.smaller(c[0], pos[0]) ? 'l' : 'r';
    var y = math.smaller(c[1], pos[1]) ? 'u' : 'd';
    var z = math.smaller(c[2], pos[2]) ? 'i' : 'o';

    return `${x}${y}${z}`;
  }

  place_inner(vertex){
    this.inners.add(vertex);
  }

  place_outer(vertex){
    var o = this.get_octant(vertex.position);
    if(!this.outers.has(o)){
      this.outers.set(o, new BarnesHutNode3(this.settings));
    }

    this.outers.get(o).insert(vertex);
  }
}


export default BarnesHutNode3;