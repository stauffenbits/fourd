import { create, all } from 'mathjs'
var math = create(all, {})
import Vertex from './Vertex.js';
import Edge from './Edge.js';
import Graph from './Graph.js';

var ID = 1;

var DynamicMatching = class DynamicMatching {
  constructor(levels, graph){
    this.graph = graph;

    this.m = new Map();
    this.pq = [];
    
    this.V = new Map();
    this.E = new Map();

    this.coarser = new Graph(levels, this.graph.settings);
  }

  remove_from_pq(edge){
    this.pq = this.pq.filter(e => !edge.same(e));
  }

  add_vertex(vertex){
    console.assert(vertex, 'that should be there');
    this.V.set(vertex.id, vertex);
    this.process_queue();
  }

  add_edge(e){
    var e_ = this.make_corresponding_edge(e)
    this.E.set(e.id, e_.id);

    this.pq.push(e_);
    this.process_queue();
  }

  remove_vertex(v){
    for(var e of this.graph.incident_edges(v)){
      this.remove_edge(e);
    }

    this.coarser.remove_vertex(this.V.get(v.id));

    this.V.delete(v.id);
    this.process_queue();
  }

  remove_edge(e){
    if(e === null){
      return;
    }

    if(this.m.has(e.id)){
      this.unmatch(e);
    }

    var e_prime = this.get_corresponding_edge(e);
    if(e_prime){
      e_prime.count--;

      if(e_prime.count <= 0){
        this.coarser.remove_edge(this.get_corresponding_edge(e).id);
        this.E.delete(e.id);

        this.remove_from_pq(e);
      }
    }

    if((this.coarser !== null) && (e.source.edges.size == 1)){
      var cv = this.get_corresponding_vertex(e.source);
      if(cv){
        this.coarser.remove_vertex(cv);
        this.V.delete(e.source.id);
      }
    }

    if((this.coarser !== null) && (e.target.edges.size == 1)){
      var cv = this.get_corresponding_vertex(e.target);
      if(cv){
        this.coarser.remove_vertex(cv);
        this.V.delete(e.target.id);
      }
    }

    if(this.coarser){
      this.m.delete(e.id);
    }

    for(var ei of this.graph.E){
      if(e.same(ei)){
        continue;
      }

      if(ei && !e.same(ei)){
        if(e.depends(ei)){
          this.pq.push(ei);
        }
      }
    }

    this.process_queue();
  }

  get_corresponding_vertex(v){
    console.assert(v, 'that should be there');
    var id = this.V.has(v.id) ? this.V.get(v.id) : null;
    if(id === null){
      return null;
    }
  
    var cv = [...this.coarser.V].find(cv => cv.id == id);
    return cv;
  }

  get_corresponding_edge(e){
    if(!e){
      return null;
    }

    var id = this.E.has(e.id) ? this.E.get(e.id) : null;
    if(id === null){
      return null;
    }else{
      var ce = [...this.coarser.E].find(ce => ce.id == id);
      return ce;
    }
  }

  make_corresponding_vertex(v){
    console.assert(v);

    var cv = this.get_corresponding_vertex(v);

    if(cv){
      return cv;
    }

    var cv = new Vertex(this.coarser)
    this.coarser.add_vertex(cv);
    v.coarser = cv;
    v.coarser.add_finer(v);

    this.V.set(v.id, cv.id);

    return v.coarser;
  }

  make_corresponding_edge(e){
    console.assert(e)
    var ce = this.get_corresponding_edge(e);

    if(ce){
      ce.count++;
      return ce;
    }

    var coarse_source = this.make_corresponding_vertex(e.source);
    var coarse_target = this.make_corresponding_vertex(e.target);

    ce = new Edge(coarse_source, coarse_target, this.coarser);
    this.E.set(e.id, ce.id)

    e.coarser = ce;

    return ce;
  }

  toJSON(){
    return {
      id: this.id,
      V: [...this.V].map(v => v.toJSON()),
      E: [...this.E].map(e => e.toJSON())
    };
  }

  clear(){
    this.coarser.clear();

    this.m = new Map();
    this.pq = [];
    this.V = new Map();
    this.E = new Map();
  }

  match(e){
    for(var e_prime of this.graph.E){
      if(e_prime.id == e.id){
        continue;
      }

      if(e.depends(e_prime) && this.m.get(e_prime.id)){
        this.unmatch(e_prime);
      }
    }

    var v1_prime = this.get_corresponding_vertex(e.source);
    var v2_prime = this.get_corresponding_vertex(e.target);

    if(v1_prime && v2_prime){
      var same = v1_prime.id === v2_prime.id;

      this.coarser.remove_vertex(v1_prime.id);
 
      if((!same) && v2_prime){
        this.coarser.remove_vertex(v2_prime.id)
      }
    }

    var v1_v2 = new Vertex(this.coarser)
    this.coarser.add_vertex(v1_v2);
    
    v1_v2.add_finer(e.source);
    v1_v2.add_finer(e.target);
    
    this.V.set(e.source.id, v1_v2.id);
    this.V.set(e.target.id, v1_v2.id);

    
    for(var ie of this.graph.incident_edges(e.source)){
      if(ie.id !== e.id){
        this.make_corresponding_edge(ie);
      }
    }


    for(var ie of this.graph.incident_edges(e.target)){
      if(ie.id !== e.id){
        this.make_corresponding_edge(ie);
      }
    }

    for(var e_prime of this.graph.E){
      if(e.depends(e_prime)){
        this.pq.push(e_prime);
      }
    }

    this.m.set(e.id, true);
  }

  unmatch(e){
    if(!e){
      return;
    }
    
    var v1_v2 = this.get_corresponding_vertex(e.source);
    if(v1_v2){
      for(var e_ of v1_v2.edges){
        this.remove_edge(e_);
      }

      this.remove_vertex(v1_v2);
    }

    var v1_prime = this.make_corresponding_vertex(e.source);
    var v2_prime = this.make_corresponding_vertex(e.target);

    for(var ie of this.graph.incident_edges(e.source)
    .concat(this.graph.incident_edges(e.target))){
      if(ie.id == e.id){
        continue;
      }

      this.make_corresponding_edge(ie);
    }

    for(var edge of this.graph.E){
      if(edge.id == e.id){
        continue;
      }

      if(e.depends(edge)){
        this.pq.push(edge);
      }
    }

    this.m.set(e.id, false);
  }

  match_equation(e){
    if(this.E.size <= 1){
      return true;
    }

    var me = true;

    for(var edge of this.graph.E){
      if(!edge){
        continue;
      }

      if(edge.id != e.id){
    
        me = me && !edge.depends(e);
        if(!me){
          return false;
        }
      }
    }

    return me;
  }

  process_queue(){
    this.pq = this.pq.sort((a, b) => a.order - b.order );

    while(this.pq.length){
      var e = this.pq.shift();
      if(!e) break;
      console.assert(e);

      var me = this.match_equation(e);

      if(me != this.m.get(e.id)){
        if(me){
          this.match(e);
        }else{
          this.unmatch(e);
        }
      }
    }
  }
}

export default DynamicMatching;