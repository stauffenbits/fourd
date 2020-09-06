import "./fourd.js"
import $ from 'jquery';
import embed from 'vega-embed';
import regeneratorRuntime from "regenerator-runtime";

import { create, all } from 'mathjs';
var math = create(all, {})

window.fourd = document.querySelector('#fourd');
$('#customStyle').on('keyup', function(){
  fourd.applyStyle();
})

var vlSpec = {
  $schema: 'https://vega.github.io/schema/vega-lite/v4.json',
  data: {name: 'table'},
  width: 400,
  mark: 'point',
  encoding: {
    x: {
      field: 'iteration', 
      type: 'quantitative',
      scale: {zero: false}
    },
    y: {
      field: 'delta', 
      type: 'quantitative', 
      scale: {domain: [-1.0, 1.0]}, 
      axis: {bandPosition: 0.5}
    },
    color: {field: 'id', type: 'nominal'}
  },
};

$('#addPyramid').click(function(){
  // a tetrahedron
  var v1 = fourd.add_vertex(), 
    v2 = fourd.add_vertex(), 
    v3 = fourd.add_vertex(), 
    v4 = fourd.add_vertex(); 
  fourd.add_edge(v1, v2); 
  fourd.add_edge(v2, v3); 
  fourd.add_edge(v1, v3); 
  fourd.add_edge(v1, v4); 
  fourd.add_edge(v2, v4); 
  fourd.add_edge(v3, v4); 
  fourd.follow(v1);

  var ve = embed('#chart', vlSpec).then((res) => {    
    var minimumX = -100;
    var counter = 0;

    var recorder = () => {
      var delta;

      return (layout) => {
        var table = [];
        counter++;

        for(var i=0; i<layout.V.length; i++){
          var vertex = fourd.V.get(layout.V[i].id);
          vertex.previous = vertex.previous === undefined ? 0.0 : vertex.previous;

          delta = vertex.previous - math.subset(vertex.position, math.index(0));
          vertex.previous = vertex.position._data[0];
    
          var row = {
            'iteration': counter,
            'delta': parseFloat(delta.toFixed(8)),
            'id': vertex.id,
          }

          table.push(row)
        }

        return table;
      };
    };

    var remover = function (t){
      return t.iteration < minimumX;
    }

    var record = recorder();
    fourd.render_hook = (layout) => {
      minimumX++;
      var changeSet = res.view.changeset().insert(record(layout)).remove(remover);
      res.view.change('table', changeSet).run();
    };
  })
})