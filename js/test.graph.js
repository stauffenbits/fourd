
import { assert } from 'chai';
import { create, all } from 'mathjs'
import Graph from '/js/Graph.js';
import DynamicMatching from '/js/DynamicMatching.js';
import Vertex from '/js/Vertex.js';
import Edge from '/js/Edge.js';

var math = create(all, {})

mocha.setup('bdd');
mocha.checkLeaks();

describe('FourD', function(){
  it('', function(){
    fourd.add_vertex({});
  })
})

describe('Vertex', function(){
  it('should be present', function(){
    assert(Vertex !== undefined, "Vertex is undefined!");
  })

  describe('Simple Instantiation', function(){
    it('should instantiate', function(){
      var graph = new Graph();
      var vertex = new Vertex(graph);
      assert.exists(vertex, "vertex doesn't exist!")
      graph = undefined;
    })
  });

  describe('pairwise repulsion', function(){
    it('should repel', function(){
      Graph.reset_id();
      var graph = new Graph();
      var v1id = graph.add_vertex();
      var v2id = graph.add_vertex();
      
      var v1 = [...graph.V].find(v => v.id == v1id);
      var v2 = [...graph.V].find(v => v.id == v2id);

      v1.position = math.random([3], 0.0, 0.5)
      v2.position = math.random([3], 0.0, 0.5)

      var initialDistance = math.abs(math.distance(v1.position, v2.position));

      for(var i=0; i<10; i++){
        var repulsion = Vertex.pairwise_repulsion(v1.position, v2.position, graph.settings);
        console.log('repulsion', repulsion)

        v1.acceleration = repulsion;
        v2.acceleration = math.unaryMinus(repulsion);

        v1.velocity = math.add(v1.velocity, v1.acceleration)
        v2.velocity = math.add(v2.velocity, v2.acceleration)

        v1.position = math.add(v1.position, v1.velocity);
        v2.position = math.add(v2.position, v2.velocity);
      }

      var postDistance = math.abs(math.distance(v1.position, v2.position));
      assert.isTrue(math.larger(postDistance, initialDistance), "Distance did not increase")
      graph = undefined;
    })
  })
});

describe('Edge', function(){
  describe('attraction', function(){
    it('should attract', function(){
      Graph.reset_id();
      var graph = new Graph();
      var v1id = graph.add_vertex();
      var v2id = graph.add_vertex();

      var v1 = [...graph.V].find(v => v.id == v1id);
      var v2 = [...graph.V].find(v => v.id == v2id);

      v1.position = math.random([3], -1, 1);
      v2.position = math.random([3], -1, 1);

      v1.position = math.multiply(v1.position, 100);
      v2.position = math.multiply(v2.position, 100);

      var initialDistance = math.distance(v1.position, v2.position);
      
      var eid = graph.add_edge(v1id, v2id);
      var edge = [...graph.E].find(e => e.id == eid);
      
      for(var i=0; i<10; i++){
        var attraction = edge.attraction(graph.settings)
        console.log('attraction', attraction)
        v1.acceleration = attraction;
        v2.acceleration = math.unaryMinus(attraction);

        v1.velocity = math.add(v1.velocity, v1.acceleration)
        v2.velocity = math.add(v2.velocity, v2.acceleration)

        v1.position = math.add(v1.position, v1.velocity);
        v2.position = math.add(v2.position, v2.velocity);
      }

      var postDistance = math.abs(math.distance(v1.position, v2.position));
      assert.isTrue(math.larger(initialDistance, postDistance), "Final distance did not decrease")
    })
  })
})

describe('Graph', function(){
  it('the class should be present', function () {
    assert(Graph !== undefined, "Graph is undefined!");
  });

  describe('Instantiation', function(){
    it('should instantiate', function(){
      
      Graph.reset_id();
      var graph = new Graph(0);
      assert.exists(graph, "graph is undefined!")
      graph = undefined;
    });

    it('should instantiate with 1 level', function(){
      Graph.reset_id();
      var graph = new Graph(1);
      
      assert.exists(graph.dm.coarser, 'graph.coarser is undefined!')
      graph = undefined;
    });
    
    it('should instantiate with 2 level', function(){
      Graph.reset_id();
      var graph = new Graph(2);
      
      assert.exists(graph.dm.coarser, 'graph.coarser is undefined!')
      graph = undefined;
    });
  });
  
  describe('layout', function(){
    it('should work with hundreds of vertices', function(done){
      Graph.reset_id();
      var graph = new Graph(1);
      var max = 10;

      var vids = [];
      for(var i=0; i<max; i++){
        var source = graph.add_vertex();
        graph.layout();
        var target = graph.add_vertex();
        graph.layout();
        graph.add_edge(source, target);
        graph.layout();
      }

      console.log(graph.layout())
      done();
    })

    it('should layout', function(){
      Graph.reset_id();
      var graph = new Graph(0);

      var vids = [
        graph.add_vertex(),
        graph.add_vertex(),
        graph.add_vertex(),
        graph.add_vertex()
      ];

      graph.layout();

      graph.add_edge(vids[0], vids[1]);
      graph.layout();
      graph.add_edge(vids[1], vids[2]);
      graph.layout();
      graph.add_edge(vids[2], vids[0]);
      graph.layout();
      graph.add_edge(vids[0], vids[3]);
      graph.layout();
      graph.add_edge(vids[1], vids[3]);
      graph.layout();
      graph.add_edge(vids[2], vids[3]);
      graph.layout();

      graph.layout();
      
      assert.equal(vids.length, 4, 'pyramid has no base!');
      graph = undefined;
    });

    it('should instantiate with 3 levels', function(){
      Graph.reset_id();
      var graph = new Graph(3);
      assert.exists(graph.dm.coarser.dm.coarser.dm.coarser !== undefined, 'graph is undefined!');
      graph = undefined;
    });
  });

  describe('Simple Operations', function(){
    it('should return a vertex id', function(){
      Graph.reset_id();
      var graph = new Graph(3);
      
      var id = graph.add_vertex();
      
      assert.notEqual(id, undefined, "vertex id undefined");
    })

    it('should return an edge id', function(){
      Graph.reset_id();
      var graph = new Graph(0);
      
      var vids = [graph.add_vertex(), graph.add_vertex()];

      assert.exists(vids[0], "source id undefined");
      assert.exists(vids[1], "target id undefined")

      var eid = graph.add_edge(vids[0], vids[1]);

      assert.exists(eid, 'edge id undefined')
    })

    it('should pass stress #1: vertices', function(){
      Graph.reset_id();
      var graph = new Graph(0);
      
      var max = 1000;

      var vids = [];
      for(var i=0; i<max; i++){
        vids.push(graph.add_vertex());

      }

      assert.equal(vids.length, max, 'failure creating vertices')
    })

    it('should pass stress #2: edges', function(){
      Graph.reset_id();
      var graph = new Graph(0);

      var max = 1000;

      var source, target;
      for(var i=0; i<max; i++){
        source = graph.add_vertex();
        target = graph.add_vertex();

        graph.add_edge(source, target);
      }

      assert.equal(graph.E.size, max, "You dropped some edges")

      graph = undefined;
    })

    it('should return an edge id at two levels', function(){
      Graph.reset_id();
      var graph = new Graph(2);

      var vids = [graph.add_vertex(), graph.add_vertex()];
      graph.layout();

      assert.exists(vids[0], "source id undefined");
      assert.exists(vids[1], "target id undefined")

      var eid = graph.add_edge(vids[0], vids[1]);
      assert.exists(eid, 'edge id undefined')
    })


    it('should return an edge id at recursive levels', function(){
      Graph.reset_id();
      var graph = new Graph(3);

      var vids = [graph.add_vertex(), graph.add_vertex()];

      assert.exists(vids[0], "source id undefined");
      assert.exists(vids[1], "target id undefined")

      var eid = graph.add_edge(vids[0], vids[1]);
      assert.exists(eid, 'edge id undefined')
    })
  })
});

describe('DynamicMatching', function(){
  it('the class should be present', function () {
    assert(DynamicMatching !== undefined, "Graph is undefined!");
  });

  describe('Instantiation', function(){
    it('the class should instantiate', function(){
      Graph.reset_id();
      var g = new Graph(1);
      assert.exists(g.dm, "DM is undefined!");
    })

    it('the test works', function(){
      Graph.reset_id();
      var g = new Graph(1);
      g.dm = null;
      assert.notExists(g.dm);
    })
  })
})