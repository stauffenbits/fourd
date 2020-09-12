import { create, all } from 'mathjs'
var math = create(all, {})

var ID = 1;

var Vertex = class Vertex {
  constructor(graph){
    this.id = ID++;
    this.graph = graph;

    this.position = math.random([3], -10.0, 10.0)
    this.velocity = math.zeros(3);
    this.acceleration = math.zeros(3);

    this.displacement = math.zeros(3);
    this.displacement_ = math.zeros(3);
    this.displacement__ = math.zeros(3);

    this.proj_accel = math.zeros(3);

    this.repulsion_forces = math.zeros(3);
    this.attraction_forces = math.zeros(3);

    this.coarser = null;
    this.finers = new Set();
    this.edges = new Set();

    if(this.graph instanceof Graph){
      this.graph.add_vertex(this);
    }
  }

  add_finer(vertex){
    this.finers.add(vertex);
    vertex.coarser = this;
  }

  has(id){
    for(var vertex of this.finers){
      if(vertex.id == id || vertex.has(id)){
        return true;
      }
    }

    return false;
  }

  static pairwise_repulsion(onePos, twoPos, settings){
    var diff = math.distance(onePos, twoPos);

    if(math.smaller(diff, settings.epsilon)){
      return math.random([3], 0.0, 0.01)
    }

    var sq = math.norm(math.square(diff))
    var firstDenominator = math.add(settings.epsilon, sq);
    var first = math.divide(settings.repulsion, firstDenominator);
    var sum = math.add(settings.epsilon, sq);
    var second = math.divide(
      diff,
      sum
    );
    
    var repulsion = math.multiply(
      first,
      second      
    );

    return repulsion;
  }

  same(other){
    return this.id == other.id;
  }

  toJSON(){
    return {id: this.id, position: this.position}
  }

  dispose(){

  }

  static reset_id(){
    ID = 1;
  }
}

export default Vertex;