import "./fourd.js"
import $ from 'jquery';
import embed from 'vega-embed';
import regeneratorRuntime from "regenerator-runtime";
import {Color} from 'three';

import { create, all } from 'mathjs';
var math = create(all, {})
window.math = math;

window.fourd = document.querySelector('#fourd');

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

    this._id = LayoutPlotter._genId();
    this.counter = 0;
  }

  static _genId(){
    LayoutPlotter.nextId += 1;
    return `Plot-${LayoutPlotter.nextId}`;
  }

  _genSpec(){
    var _id = this._id;
    var xField = this.xField;
    var yField = this.yField;
    var categoryField = this.categoryField;

    this.spec = {
      $schema: 'https://vega.github.io/schema/vega-lite/v4.json',
      data: {name: _id},
      width: 450,
      mark: 'point',
      encoding: {
        x: {
          field: xField, 
          type: 'quantitative',
          scale: {zero: false},
          labels: true
        },
        y: {
          field: yField, 
          type: 'quantitative', 
          axis: {bandPosition: 0.5},
          labels: true
        },
        color: {field: categoryField, type: 'nominal'}
      },
    };
  }

  plot(yField){
    this.yField = yField;

    this.view = new Promise((resolve, reject) => {
      this.resolveView = resolve;
      this.rejectView = reject;
    })

    return this;
  }

  over(xField){
    this.xField = xField;
    return this;
  }

  colorBy(categoryField){
    this.categoryField = categoryField;
    return this;
  }

  set drawRange(val){
    this._drawRange = val;
    this.minX = -val;
    this.removable = (t) => t[this.xField] < this.minX;
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

  makeVertexRecorder(collect){
    return (layout) => {
      var table = [];
      this.counter++;

      for(var i=0; i<layout.V.length; i++){
        var vertex = this.fourd.V.get(layout.V[i].id);
        var previous = vertex.previous === undefined ? 0.0 : vertex.previous;

        var record = {};
        record[this.xField] = this.counter;
        record[this.yField] = previous - collect(vertex, layout);
        record[this.categoryField] = vertex[this.categoryField];

        vertex.previous = previous;

        table.push(record);
      }

      return table;
    };
  }
 
  makeEdgeRecorder(collect){
    return (layout) => {
      var table = [];
      this.counter++;

      for(var i=0; i<layout.E.length; i++){
        var edge = this.fourd.E.get(layout.E[i].id);
        var previous = edge.previous === undefined ? 0.0 : edge.previous;

        var record = {};
        record[this.xField] = this.counter;
        record[this.yField] = previous - collect(edge, layout);
        record[this.categoryField] = edge[this.categoryField];

        edge.previous = previous;
        table.push(record);
      }

      return table;
    }
  }

  makeRemovable(){
    return t => t[this.xField] < this.minX;
  }

  stream(objectType="vertices", collect){
    // 1
    this.drawRange = 100;
    this.counter = 0;
    var record;

    switch(objectType){
      case "vertices":
        record = this.makeVertexRecorder(collect);
        break;
      case "edges":
        record = this.makeEdgeRecorder(collect);
        break;
    }
    var removable = this.makeRemovable();
    
    this.view.then(view => {
      // 3
      this.fourd.render_hook.push((layout) => {
        this.minX++;
        var changeSet = view.changeset()
          .insert(record(layout))
          .remove(removable);
        view.change(this._id, changeSet).run();
      })
    })

    // 2
    this._genSpec()
    this.ve = embed(this.chartSel, this.spec).then(res => {
      this.resolveView(res.view);
    })

    // 4
    return this;
  }
}
LayoutPlotter.nextId = 0;

window.LayoutPlotter = LayoutPlotter;

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

  new LayoutPlotter('#fourd', '#chart')
    .plot('deltaNorm').over('iteration')
    .colorBy('id')
    .stream('vertices', vertex => vertex.previous - math.norm(vertex.position, 3));


  /*
  new LayoutPlotter('#fourd', '#chart')
    .plot('distance').over('iteration')
    .colorBy('id')
    .stream('edges', (edge, layout) => math.distance(edge.source.position, edge.target.position))
    */
});
