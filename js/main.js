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


var LayoutPlotter = class LayoutPlotter {
  /** 
   * Usage: 
   *   var lp = new LayoutPlotter('#fourd', '#char');
   *   var plotter = lp
   *    .plot('deltaNorm').over('iterations').colorBy('id')
   *    .collect(function(vertex){
   *      return {
   *        vertex.previous - math.norm(vertex.position, 3);
   *      })
   *   ...
   *   plotter.stream(vertex)
   *   ...
   * 
   * Parameters: 
   * - fourdSel: A selector of the fourd element
   * - chartSel: A selector of the chart element
   * 
   * Preconditions:
   * - Element identified by fourdSel exists on the page
   * - Element identified by chartSel exists on the page
   * 
   * Postconditions: 
   * - .vertexToRow can be set to a function
   * 
   */
  constructor(fourdSel, chartSel){
    this.fourd = document.querySelector(fourdSel);
    this.chartSel = chartSel;

    this.drawRange = 100;

    this._id = this._genId();
    this.counter = 0;
  }

  static _genId(){
    LayoutPlotter.nextId += 1;
    return `Plot #${LayoutPlot.nextId}`;
  }

  _genSpec(){
    return this.spec = {
      $schema: 'https://vega.github.io/schema/vega-lite/v4.json',
      data: {name: this._id},
      width: 450,
      mark: 'point',
      encoding: {
        x: {
          field: this.xField, 
          type: 'quantitative',
          scale: {zero: false},
          axis: {labels: true}
        },
        y: {
          field: this.yField, 
          type: 'quantitative', 
          axis: {bandPosition: 0.5, labels: true}
        },
        color: {field: this.categoryField, type: 'nominal'}
      },
    };
  }

  /** 
   * Preconditions:
   * - .vertexToRow has been set
   * 
   * Parameters:
   * - xField: The name of the streaming object's field containing the plot's x-value
   * - yField: The name of the streaming object's field containing the plot's y-value
   * - categoryField: Name of the streaming object's field containing the plot's category (color) value
   * 
   * PostConditions: 
   * - 
   * 
   * Return Value:
   * - promise resolving to embed return value
   * 
  */
  plot(yField){
    this.yField = yField;

    this.view = new Promise((resolve, reject) => {
      this.resolveView = resolve;
      this.rejectView = reject;
    })

    return {
      over: this.over
    }
  }

  over(xField){
    this.xField = xField;

    return {
      colorBy: this.colorBy
    }
  }

  colorBy(categoryField){
    this.categoryField = categoryField;
    this._genSpec()
    this.ve = embed(this.chartSel, this.spec).then(res => {
      this.resolveView(res.view);
    })

    var plotter = {
      stream: this.stream
    }

    return plotter;
  }

  set drawRange(val){
    this._drawRange = -val;
    this.removable = (t) => t.x < this.drawRange;
    this.counter = 0;
  }

  get drawRange(){
    return this._drawRange; 
  }

  set vertexToRow(fn){
    this._vertexToRow = fn;
  }

  get vertexToRow(){
    return this._vertexToRow;
  }

  makeRecorder(collect){
    return (layout) => {
      var table = [];
      counter++;

      for(var i=0; i<layout.V.length; i++){
        var vertex = this.fourd.V.get(layout.V[i].id);
        vertex.previous = vertex.previous === undefined ? 0.0 : vertex.previous;

        var record = {};
        record[this.xField] = counter;
        record[this.yField] = collect(vertex);
        record[this.categoryField] = vertex[this.categoryField];

        table.push(record);
      }

      return table;
    };
  }

  stream(collect){
    this.minX = this.drawRange;
    this.counter = 0;    
    this.record = makeRecorder(collect);

    this.fourd.render_hook = (layout) => {
      this.minX++;
      this.view.then(view => {
        var changeSet = view.changeset()
          .insert(this.record(layout))
          .remove(this.removable);
        view.change(this._id, changeSet).run();
      })
    };
  }
}
LayoutPlotter.nextId = 0;

var deltaSpec = {
  $schema: 'https://vega.github.io/schema/vega-lite/v4.json',
  data: {name: 'table'},
  width: 450,
  mark: 'point',
  encoding: {
    x: {
      field: 'iteration', 
      type: 'quantitative',
      scale: {zero: false},
      labels: true
    },
    y: {
      field: 'delta', 
      type: 'quantitative', 
      axis: {bandPosition: 0.5},
      labels: true
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

  var ve = embed('#chart', deltaSpec).then((res) => {    
    

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
    var minimumX = -100;
    var counter = 0;
    fourd.render_hook = (layout) => {
      minimumX++;
      var changeSet = res.view.changeset().insert(record(layout)).remove(remover);
      res.view.change('table', changeSet).run();
    };
  })
})