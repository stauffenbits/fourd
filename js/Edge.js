import { create, all } from 'mathjs'
var math = create(all, {})

import Vertex from './Vertex';



var ID = 1;

var Edge = class Edge {
  constructor(source, target, directed=false, strength=1.0, graph){
    this.graph = graph;
    this.id = ID++;
    
    this.source = source;
    this.target = target;

    this.source.edges.add(this);
    this.target.edges.add(this);
  
    this.directed = directed;
    this.strength = strength;

    this.coarser = null;

    this.count = 1;
    this.order = Math.random();

    if(this.graph instanceof Graph){
      this.graph.add_edge(this);
    }
  }

  depends(other){
    return (this.order < other.order)
    && (
      (this.source.same(other.source)
      || this.source.same(other.target)
      || this.target.same(other.source)
      || this.target.same(other.target))
    );
  }

  attraction(settings){
    var diff = math.subtract(
      this.source.position,
      this.target.position
    );

    var product = math.multiply(
      settings.attraction,
      -1.0
    );

    var a = math.multiply(
      math.norm(diff),
      product
    );

    /*
    if(this.directed){
      var distance = math.norm(
        math.subtract(
          this.source.position,
          this.target.position
        )
      );
      var gravity = math.matrix([.0, distance, .0])
      var b = math.add(
        a,
        math.multiply(
          gravity,
          distance,
          strength
        )
      )
      a = b
    }
    */

    return a;
  }

  shares_vertex_with(other){
    return this.source.same(other.source)
    || this.source.same(other.target)
    || this.target.same(other.source)
    || this.target.same(other.target);
  }

  same(other){
    return this.id == other.id;
  }

  toJSON(){
    return {
      id: this.id,
      source: this.source.id,
      target: this.target.id,
    }
  }

  static reset_id(){
    ID = 1;
  }
}

export default Edge;