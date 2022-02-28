import React, { Suspense, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import "./App.css";
import * as THREE from "three";
import { RenderDelegateInterface } from "./USD/ThreeJsRenderDelegate.js";
import { OrbitControls, Environment } from "@react-three/drei";

function Animate({ endTimeCode }) {
  const ETC = endTimeCode;
  useFrame((state, delta) => {
    const timeout = 40;
    let secs = new Date().getTime() / 1000;
    const time = (secs * (1000 / timeout)) % ETC;
    window.driver.SetTime(time);
    window.driver.Draw();
  });
  return null;
}

export default function App() {
  // Not sure about the correct/best way to import the bindings
  // with the sharedarraybuffer shenanigans.
  // useEffect(() => {
  //   const script = document.createElement("script");

  //   script.src = "emHdBindings.js";
  //   script.async = true;

  //   document.body.appendChild(script);

  //   return () => {
  //     document.body.removeChild(script);
  //   };
  // }, []);

  const [endTimeCode, setEndTimeCode] = useState();

  useEffect(() => {
    let filename = "spherebot2.usdz";

    // Load the usd file
    let loadUSDPromise = new Promise((resolve, reject) => {
      let req = new XMLHttpRequest();
      req.open("GET", "/" + filename, true);
      req.responseType = "arraybuffer";

      req.onload = function (oEvent) {
        let arrayBuffer = req.response; // Note: not oReq.responseText
        if (arrayBuffer) {
          resolve(arrayBuffer);
        } else {
          reject();
        }
      };

      req.send(null);
    });

    Promise.all([loadUSDPromise, window.getUsdModule()]).then(
      async ([usdFile, Usd]) => {
        window.Usd = Usd;
        let extension = filename.split(".")[1];
        let inputFile = "input." + extension;

        Usd.FS.createDataFile(
          "/",
          inputFile,
          new Uint8Array(usdFile),
          true,
          true,
          true
        );

        let renderInterface = new RenderDelegateInterface(inputFile);
        let driver = (window.driver = new Usd.HdWebSyncDriver(
          renderInterface,
          inputFile
        ));

        driver.Draw();
        window.usdStage = window.driver.GetStage();
        setEndTimeCode(window.usdStage.GetEndTimeCode());
        // const stage = (window.usdStage = window.driver.GetStage());
      }
    );
  }, []);

  return (
    <div className="App">
      <Canvas
        camera={{ position: [0, 7, 7], rotation: [0, 0, 0], fov: 50 }}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.CineonToneMapping;
          gl.toneMappingExposure = 2;
          gl.shadowMap.enabled = false;
          // gl.shadowMap.type = THREE.VSMShadowMap; //Something not right with this type
          scene.background = new THREE.Color("#4f5254");
          window.scene = scene;
          window.renderer = gl;
        }}
      >
        {endTimeCode && <Animate endTimeCode={endTimeCode} />}
        <Suspense fallback={null}>
          <Environment preset="studio" />
        </Suspense>
        <ambientLight intensity={0.06} />
        <pointLight
          position={[-30, 20, 220]}
          castShadow
          shadow-camera-near={8}
          shadow-camera-far={1000}
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
          shadow-bias={-0.002}
          shadow-radius={4}
          shadow-samples={8}
        />
        <OrbitControls />
      </Canvas>
    </div>
  );
}
