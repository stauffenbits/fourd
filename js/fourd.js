import * as Command from './Command.js';
import * as THREE from 'three';
import Graph from './Graph.js'
import { MeshPhongMaterial } from 'three';
import Edge from './Edge.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import Vertex from './Vertex.js';
import Settings from './Settings.js';

window.Graph = Graph;

CSS.registerProperty({
  name: '--vertex-color',
  syntax: '<color>',
  inherits: true,
  initialValue: 'black',
});

CSS.registerProperty({
  name: '--edge-color',
  syntax: '<color>',
  inherits: true,
  initialValue: 'darkblue',
});

function rgbToHex(rgb) {

  try{
    // Choose correct separator
    rgb = rgb.substr(4, rgb.length-5)
    // Turn "rgb(r,g,b)" into [r,g,b]
    rgb = rgb.split(',');

    let r = (+rgb[0]).toString(16),
        g = (+rgb[1]).toString(16),
        b = (+rgb[2]).toString(16);

    if (r.length == 1)
      r = "0" + r;
    if (g.length == 1)
      g = "0" + g;
    if (b.length == 1)
      b = "0" + b;

    return parseInt(r + g + b, 16)
  }catch(e){
    console.error(`Error, probably parsing color: ${e}`);
    return parseInt(0xffffff, 16);
  }
}

// Creates MyElements extending HTML Element
class FourD extends HTMLElement {
  // Fires when an instance of the element is created or updated
  constructor() {
    super();

    this.settings = new Settings();
    this.graph = new Graph(0, this.settings);

    this.attachShadow({mode: 'open'})
    var template = document.createElement('template');
    template.innerHTML = `
    <style>
    :host {
      display: inline-block;
      border: 0;
      background-color: lightgreen;
      --vertex-color: orangered;
      --edge-color: darkblue;
    }

    :host>canvas {
      width: 100%;
      height: 100%;
    }

    :host>#colorConverter {
      z-index: -1;
      width: 0;
      height: 0;
      color: var(--vertex-color);
      background-color: var(--edge-color);
    }
    </style>
    `
    this.shadowRoot.appendChild(template.content.cloneNode(true))
    this.afr = false;

    this.styleObserver = new MutationObserver(this.applyStyle.bind(this, 'style'));
    this.converter = document.createElement('div');
    this.converter.id = 'colorConverter';
    this.shadowRoot.appendChild(this.converter);

    this.three = {};
    this.three.V = new Map();
    this.three.E = new Map();

    this.V = new Map([]);
    this.E = new Map([]);

    this.style = this.shadowRoot.querySelector('style');

    this._render_hook = [];
  }

  set render_hook(fn){
    this._render_hook.push(fn);
  }

  get render_hook(){
    return this._render_hook;
  }

  convertColor(colorString){
    this.appendChild(this.converter)
    this.converter.style.backgroundColor = colorString;
    var style = getComputedStyle(this.converter);
    var color = style.getPropertyValue('backgroundColor');
    this.removeChild(this.converter);
    return color;
  }


  add_vertex(options={size: 1, shape: 'cube', texture: undefined, color: undefined, label: undefined, wireframe: false}){
    if(options.color === undefined){
      var vertexColor = getComputedStyle(this).getPropertyValue('--vertex-color');
      options.color = new THREE.Color(vertexColor);
    }

    options = Object.assign({size: 1, shape: 'cube', texture: undefined, color: vertexColor, label: undefined, wireframe: false}, options);

    var vertex = new Vertex(this.graph);

    var object;
    var geometry;
    var materialArgs;
    var material;

    switch(options.shape){
      case 'cube':
        geometry = new THREE.BoxGeometry(options.size, options.size, options.size);
        break;

      case 'sphere':
        geometry = new THREE.SphereGeometry(options.size);
        break;
    }
    geometry.dynamic = true;

    if(options.texture !== undefined){
      materialArgs = { 
        map: new THREE.TextureLoader().load(options.texture)
      };
    }else{
      materialArgs = { color: options.color, wireframe: options.wireframe };
    }
    material = new THREE.MeshPhongMaterial(materialArgs);
    
    object = new THREE.Mesh( geometry, material );
    object.position.set(Math.random()*10, Math.random()*10, Math.random()*10);
    this.three.scene.add(object);
    this.three.V.set(vertex.id, object);
    this.V.set(vertex.id, vertex);
    
    return vertex.id;
  }

  remove_vertex(id){
    var vertex = this.V.get(id);
    var object = this.three.V.get(id);

    var edges = [...vertex.edges];
    for(var edge of edges){
      this.graph.remove_edge(id);
    }

    this.three.scene.remove(object);

    object.geometry.dispose();
    object.material.dispose();
    object.dispose();
  }

  add_edge(vid1, vid2, options={arrow: false, dashed: false, color: 0x000000, strength: 1.0, width: 1}){
    var options = Object.assign({arrow: false, dashed: false, color: 0x000000, strength: 1.0, width: 1}, options);

    var sourceBox = this.three.V.get(vid1);
    var targetBox = this.three.V.get(vid2);

    var source = this.V.get(vid1);
    var target = this.V.get(vid2);
    var edge = new Edge(source, target, false, options.strength, this.graph);
    
    console.assert(sourceBox, 'source should be defined');
    console.assert(targetBox, 'target should be defined')

    var line;

    if(options.arrow){
      var dir = new THREE.Vector3().subVectors( targetBox.position, sourceBox.position ).normalize();
      var origin = sourceBox.position;
      var length = 1;

      line = new THREE.ArrowHelper( dir, origin, length, options.color );
    }else{
      var points = [
        sourceBox.position,
        targetBox.position
      ];
      var geometry = new THREE.BufferGeometry().setFromPoints(points);
      geometry.setDrawRange( 0, 2 );
      geometry.dynamic = true;
      
      var material;
      if(!options.dashed){
        material = new THREE.LineBasicMaterial({
          color: options.color,
          linewidth: options.width
        });
      }else{
        options.dashed = Object.assign({
          scale: 1,
          dashSize: 3,
          gapSize: 1
        }, options.dashed)

        material = new THREE.LineDashedMaterial({
          color: options.color,
          linewidth: options.width,
          scale: options.dashed.scale,
          dashSize: options.dashed.dashSize,
          gapSize: options.dashed.gapSize
        });
      }
      
      var line = new THREE.Line( geometry, material );
      line.computeLineDistances();
    }
    
    this.three.scene.add(line);
    this.three.E.set(edge.id, line);
    this.E.set(edge.id, edge);

    return edge.id;
  }

  remove_edge(id){

  }

  convertPos(mathPos){
    return new THREE.Vector3(
      mathPos[0],
      mathPos[1],
      mathPos[2]
    );
  }

  // Fires when an instance was inserted into the document
  connectedCallback() {
    var scene = new THREE.Scene();

    var camera = new THREE.PerspectiveCamera(
      75, 
      this.clientWidth / this.clientHeight,
      0.1,
      10000
    );
    camera.position.set(0, 0, -20);
    camera.lookAt(0, 0, 0);

    var renderer = new THREE.WebGLRenderer({
      antialias: true
    })
    renderer.setSize(this.clientWidth, this.clientHeight)
    renderer.setClearColor(0x00bbcc);
    
    var light = new THREE.AmbientLight(0xffffff, 1.0)
    scene.add(light);
    light.position.set(20, 20, -20)

    // setup
    Object.assign(this.three, {
      clock: new THREE.Clock(true),
      camera,
      scene,
      renderer,
      light,
      canvas: renderer.domElement,
      controls: new OrbitControls(camera, renderer.domElement)
    });

    this.three.controls.target = new THREE.Vector3(0, 0, 0)

    this.shadowRoot.appendChild(this.three.canvas);
    
    // render
    var style = getComputedStyle(this);
    var vertexColor = style.getPropertyValue('--vertex-color');
    this.style.setProperty('--vertex-color', vertexColor);

    this.applyStyle('style');

    if(document.visibilityState == 'visible'){
      this.resume();
    }

    document.addEventListener('visibilitychange', () => {
      if(document.visibilityState == 'hidden'){
        this.pause();
      }else{
        this.resume();
      }
    }, {passive: true})

    window.onresize = this.onresize.bind(this);

    this.styleObserver.observe(this, {
      attributes: true,
      attributeFilter: ['class', 'style']
    });
  }

  follow(vid){
    var object = this.three.V.get(vid);
    this.three.controls.target = object.position;
    this.three.controls.update();
  }

  animate(){
    var afr = requestAnimationFrame(this.animate.bind(this));
    this.afr = afr;

    this.three.controls.update(this.three.clock.getDelta());
    var layout = this.graph.layout();

    var vid, pos;
    for(var i=0; layout.V && i<layout.V.length; i++){
      var vid = layout.V[i].id;
      var pos = this.convertPos(layout.V[i].position._data);

      var object = this.three.V.get(vid);
      object.position.copy(pos);
      object.geometry.verticesNeedUpdate = true;
    }
      
    for(var i=0; layout.E && i<layout.E.length; i++){
      var eid = layout.E[i].id;
      var edge = this.E.get(eid);

      var sourcePos = this.convertPos(edge.source.position._data);
      var targetPos = this.convertPos(edge.target.position._data);
      
      var line = this.three.E.get(eid);
      if(line.type == "Line"){
        line.geometry.setFromPoints([
          sourcePos, targetPos
        ])

        line.geometry.verticesNeedUpdate = true;
        line.geometry.computeBoundingSphere();
      }else{
        line.position.set(sourcePos);
        var direction = new THREE.Vector3().subVectors(targetPos, sourcePos);
        line.setDirection(direction.normalize());
        line.setLength(direction.length());
      }
    }

    this.render_hook.push(layout);
    this.three.renderer.render(this.three.scene, this.three.camera);
  }

  onresize(){
    if(!this.three || !this.three.camera || !this.three.renderer){
      return;
    }

    this.three.camera.aspect = this.clientWidth / super.clientHeight;

    this.three.renderer.setSize(
      this.clientWidth,
      this.clientHeight,
      true
    );

    this.three.camera.updateMatrix();
  }

  pause(){
    if(this.afr){
      window.cancelAnimationFrame(this.afr);
    }
  }

  resume(){
    this.animate();
  }

  // Fires when an instance was removed from the document
  disconnectedCallback() {
    this.pause();

    this.three.camera.dispose();
    this.three.scene.dispose();
    this.three.renderer.dispose();
  }

  applyStyle(attrName, old=null, about=null){
    switch(attrName){
      case 'style':
        try{
          var style = getComputedStyle(this)

          if((this.style.width !== style.width) 
            || (this.style.height !== style.height)){
            this.onresize();
          }
            
          if(this.style.backgroundColor !== style.backgroundColor){
            this.style.backgroundColor = style.backgroundColor;
            this.three.renderer.setClearColor(style.backgroundColor);
          }

          if(style.getPropertyValue('--vertex-color') !== this.style.getPropertyValue('--vertex-color')){
            var vertexColor = style.getPropertyValue('--vertex-color');
            vertexColor = this.convertColor(vertexColor);
            
            for(var cube of Object.keys(this.three.V).map(vid => this.three.V.get(vid))){
              cube.material.color.set(new THREE.Color(vertexColor));
              cube.material.needsUpdate = true;
            }

            this.style.setProperty('--vertex-color', vertexColor);
          }

          return false;
        }catch(e){
          console.error(`Error, probably parsing style: ${e}`);
        }

      break;

      case 'class':
        try{
          var style = getComputedStyle(this);
          this.applyStyle('style');
        }catch(e){
          console.error(`Error, probably parsing style: ${e}`)
        }
        break;
    }

    return false;
  }

  // Fires when an element is moved to a new document
  adoptedCallback() {
    console.log('adopted')
  }
}

// Registers custom element
window.customElements.define('jmm-fourd', FourD);