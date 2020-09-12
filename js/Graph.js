import { create, all } from 'mathjs'
var math = create(all, {})
import Vertex from './Vertex.js';
import Edge from './Edge.js';
import DynamicMatching from './DynamicMatching.js';
import BarnesHutNode3 from './BarnesHutNode3.js';

var ID = 1;

var Graph = class Graph {

  constructor(levels=0, settings=new Settings()){
    this.settings = settings;

    this.id = ID++;

    this.V = new Set();
    this.E = new Set();

    if(levels > 0){
      this.dm = new DynamicMatching(levels-1, this);
    }else{
      this.dm = null;
    }
    
    this.alpha = math.zeros(3, 3);
    this.alpha_ = math.zeros(3, 3);

    this.beta = math.zeros(3);
    this.beta_ = math.zeros(3);
  }

  add_vertex(vertex){
    this.V.add(vertex);

    if(this.dm !== null){
      this.dm.add_vertex(vertex);
    }

    return vertex.id;
  }

  add_edge(edge){
    console.assert(edge.source, 'source should be defined');
    console.assert(edge.target, 'target should be defined');

    this.E.add(edge);

    if(this.dm !== null){
      this.dm.add_edge(edge);
    }

    return edge.id;
  }

  remove_vertex(id){
    var v = [...this.V].find(v => v.id == id);
    if(v === undefined){
      return false;
    }

    for(var eid of this.incident_edges(v)){
      this.remove_edge(eid);
    }

    if(this.dm !== null){
      this.dm.remove_vertex(id);
    }

    this.V.delete(v);
    return true;
  }

  remove_edge(id){
    var e = [...this.E].find(e => e.id == id);

    if(e === undefined){
      return false;
    }

    if(this.dm !== null){
      this.dm.remove_edge(e);
    }

    this.E.delete(e);

    return true;
  }

  clear(){
    this.reset_id();
    Vertex.reset_id();
    Edge.reset_id();

    if(this.dm !== null){
      this.dm.clear();
    }

    this.E.clear();
    this.V.clear();

    return true;
  }

  alpha__(){
    var sum = math.zeros(3, 3);

    if((this.V.size == 0 )|| (this.dm.coarser.V.size == 0)){
      return sum;
    }

    var x, y;
    var part1;
    var part2;
    var partialSum;

    for(var v of Object.keys(this.V)){
      y = this.dm.get_corresponding_vertex(v);

      if(!y.position){
        continue;
      }

      sum = math.add(
        sum, 
        math.add(
          math.multiply(
            math.transpose(y.position),
            v.displacement
          ), 
          math.multiply(
            math.transpose(v.displacement),
            y.position
          )))
    }

    var a__ = math.divide(sum, parseFloat(this.V.size));

    this.alpha_ = math.add(this.alpha_, a__);
    this.alpha = math.add(this.alpha, this.alpha_);
 
    return a__;
  }

  beta__(){
    var sum = math.zeros(3);

    if(this.V.size == 0 || this.dm.coarser.V.size == 0){
      return sum;
    }

    var v;
    for(var v of this.V){
      sum = math.add(sum, v.displacement);
    }

    var b__ = math.divide(sum, parseFloat(this.V.size));
    b__ = math.subtract(
      b__,
      math.dotMultiply(
        this.settings.dampening,
        this.beta_
      )
    );

    this.beta_ = math.add(this.beta_, b__);
    this.beta = math.add(this.beta, this.beta_);

    return b__;
  }

  layout(){
    if(this.dm === null){
      this.single_level_dynamics();
      return this.toJSON();
    }

    this.dm.coarser.layout();
    this.two_level_dynamics();

    

    return this.toJSON();
  }

  toJSON(){
    return {
      id: this.id,
      V: [...this.V].map(v => v.toJSON()),
      E: [...this.E].map(e => e.toJSON())
    };
  }

  incident_edges(vertex){
    // turn into yielding thing
    var n = [];
    if(vertex === null){
      return n;
    }

    for(var e of this.E){
      if((e != null) && (
        (e.source !== null) && (e.source.same(vertex))
        || (e.target !== null) && (e.target.same(vertex))
      )){
        n.push(vertex)
      }
    }

    return n;
  }

  single_level_dynamics(){
    var tree = new BarnesHutNode3(this.settings);

    for(var v of this.V){
      v.acceleration = math.zeros(3);
      tree.insert(v);
    }

    // repulsion
    for(var v of this.V){
      var repulsion = tree.estimate(v, Vertex.pairwise_repulsion);
      v.acceleration = math.add(v.acceleration, repulsion);
    }

    // attraction
    for(var edge of this.E){
      var attraction = edge.attraction(this.settings)
      edge.source.acceleration = math.subtract(edge.source.acceleration, attraction);
      edge.target.acceleration = math.add(edge.target.acceleration, attraction);
    }
   
    for(var v of this.V){
      var friction = this.settings.friction;
      friction = math.multiply(
        v.velocity,
        this.settings.friction
      )

      v.acceleration = math.subtract(v.acceleration, friction);

      v.velocity = math.add(
        v.acceleration,
        v.velocity
      );
      v.position = math.add(
        v.velocity,
        v.position
      );
    }
  }

  two_level_dynamics(){
    var a__ = this.alpha__();
    var b__ = this.beta__();
    var theta = this.settings.theta;

    var v, y;
    var sum = math.zeros(3);

    for(v of [...this.V]){
      sum = math.zeros(3);

      v.proj_accel = math.zeros(3)
      v.acceleration = math.zeros(3);
      // should this be make_...?
      y = this.dm.get_corresponding_vertex(v);
      if(!y){
        continue;
      }

      v.proj_accel = math.subtract(
        v.displacement__,
        math.add(
          b__,
          math.multiply(alpha__, v.position),
          math.multiply(2, alpha_, theta, v.velocity),
          math.multiply(alpha, theta, theta, v.acceleration)
        )
      )

      v.proj_accel = sum;
    }

    this.single_level_dynamics();

    for(var v of this.V){
      if(v.proj_accel){
        v.displacement__ = math.subtract(
          v.acceleration, 
          v.proj_accel
        );
        v.displacement_ = math.add(
          v.displacement_,
          v.displacement__
        );
        v.displacement = math.add(
          v.displacement,
          v.displacement_
        );

        v.acceleration = math.add(
          v.displacement__,
          v.proj_accel
        );
        v.velocity = math.add(
          v.velocity,
          v.acceleration
        );
        v.position = math.add(
          v.position, 
          v.velocity
        )
      }
    }
  }

  static reset_id(){
    ID = 1;
  }
}

export default Graph;