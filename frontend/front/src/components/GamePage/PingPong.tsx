import "../../styles/BackGround.css";
import "../../styles/PingPong.css";

import React, { useEffect } from "react";

import * as chatAtom from "../atom/ChatAtom";
import { gameSocketAtom, gameWinnerAtom, isGameStartedAtom, isP1Atom, isPrivateAtom } from "../atom/GameAtom";
import { Game } from "./Pong";


import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useRef, useState } from "react";
import { gameResultModalAtom, isLoadingAtom } from "../atom/ModalAtom";
import {
  ball,
  HEIGHT,
  paddle,
  player1,
  player2,
  WIDTH,
} from "./GameInfo";

import { AdminLogPrinter } from "../../event/event.util";
import { GameCoordinate, scoreInfo, Direction, Hit, GameType } from "../../socket/game.dto";

export default function PingPong() {

  const [upArrow, setUpArrow] = useState(false);
  const [downArrow, setDownArrow] = useState(false);
  const [adminConsole] = useAtom(chatAtom.adminConsoleAtom);
  const canvas = useRef<HTMLCanvasElement>(null);

  const [isLoading, setIsLoading] = useAtom(isLoadingAtom);
  const [isPrivate, setIsPrivate] = useAtom(isPrivateAtom);
  const [isGameStart, setIsGameStart] = useAtom(isGameStartedAtom);
  // const [isQueue, setIsQueue] = useAtom(isQueueAtom);
  const [gameResultModal, setGameResultModal] = useAtom(gameResultModalAtom);

  const gameSocket = useAtomValue(gameSocketAtom);

  const isP1 = useAtomValue(isP1Atom);
  // const setGameWinner = useSetAtom(gameWinnerAtom);
  const [gameWinner, setGameWinner] = useAtom(gameWinnerAtom);

  // let cnt: number = 0
  const [cnt, setCnt] = useState(0);
  // const [serverClientTimeDiff, setServerClientTimeDiff] = useAtom(serverClientTimeDiffAtom);

  let serverClientTimeDiff: number = 1000;

  const coords: GameCoordinate = {
    paddle1Y: 225,
    ballX: 1150 / 2,
    ballY: 300,
    paddle2Y: 225,
    ballSpeedX: 0,
    ballSpeedY: 0,
    paddleSpeed: 0.6,
    keyPress: [0, 0, 0, 0],
    time: Date.now(),
  };

  let lastUpdateTime: number = coords.time;
  let requestAnimationId: number = 0;

  // 1 sec delay for init value
  let pingRTTmin: number = 2000;
  let pingInterval: NodeJS.Timer;

  const pingEvent = () => {
    if (!isGameStart) {
      clearInterval(pingInterval);
    }
    const curTime = Date.now();
    const pingEventHandler = (serverTime: number) => {
      const now = Date.now();
      const pingRTT = now - curTime;
      AdminLogPrinter(adminConsole, `pingRTT: ${pingRTT}ms`);
      if (pingRTTmin > pingRTT) {
        pingRTTmin = pingRTT;
        const adjServerTime = serverTime + pingRTTmin / 2;
        serverClientTimeDiff = now - adjServerTime
      }
    };
    gameSocket.emit("ping", pingEventHandler);
  };

  useEffect(() => {
    console.log("pingInterval");
    pingInterval = setInterval(pingEvent, 1000);
    return () => {
      console.log("clear pingInterval");
      clearInterval(pingInterval);
    }
  }, []);

  const setCoords = (gameCoord: GameCoordinate) => {
    coords.paddle1Y = gameCoord.paddle1Y ;
    coords.ballX = gameCoord.ballX;
    coords.ballY = gameCoord.ballY ;
    coords.paddle2Y = gameCoord.paddle2Y ;
    coords.ballSpeedX = gameCoord.ballSpeedX ;
    coords.ballSpeedY = gameCoord.ballSpeedY ;
    coords.paddleSpeed = gameCoord.paddleSpeed ;
    coords.time = gameCoord.time ;

    for (let i = 0; i < 4; i++) {
      coords.keyPress[i] = gameCoord.keyPress[i];
    }
  }

  const syncDataHandler = (gameCoord: GameCoordinate) => {
    for (let i = 0; i < 4; i++) {
      if (gameCoord.keyPress[i] !== 0) {
        gameCoord.keyPress[i] += serverClientTimeDiff;
      }
    }
    if (isP1 === false) {
      gameCoord.ballX = WIDTH - gameCoord.ballX;
      gameCoord.ballSpeedX = -gameCoord.ballSpeedX;
      const tmpPaddle1Y = gameCoord.paddle1Y;
      gameCoord.paddle1Y = gameCoord.paddle2Y;
      gameCoord.paddle2Y = tmpPaddle1Y;
      const tmpUp = gameCoord.keyPress[0];
      const tmpDown = gameCoord.keyPress[1];
      gameCoord.keyPress[0] = gameCoord.keyPress[2];
      gameCoord.keyPress[1] = gameCoord.keyPress[3];
      gameCoord.keyPress[2] = tmpUp;
      gameCoord.keyPress[3] = tmpDown;
    }
    gameCoord.time += serverClientTimeDiff;
    setCoords(gameCoord);
    update(Date.now(), gameCoord.time);
  };

  const scoreEventHandler = ({gameCoord, scoreInfo}: {gameCoord: GameCoordinate, scoreInfo: scoreInfo}) => {
    if (isP1) {
      player1.score = scoreInfo.p1Score;
      player2.score = scoreInfo.p2Score;
    } else {
      player1.score = scoreInfo.p2Score;
      player2.score = scoreInfo.p1Score;
    }
    for (let i = 0; i < 4; i++) {
      if (gameCoord.keyPress[i] !== 0) {
        gameCoord.keyPress[i] += serverClientTimeDiff;
      }
    }
    if (isP1 === false) {
      gameCoord.ballX = WIDTH - gameCoord.ballX;
      gameCoord.ballSpeedX = -gameCoord.ballSpeedX;
      const tmpPaddle1Y = gameCoord.paddle1Y;
      gameCoord.paddle1Y = gameCoord.paddle2Y;
      gameCoord.paddle2Y = tmpPaddle1Y;
      const tmpUp = gameCoord.keyPress[0];
      const tmpDown = gameCoord.keyPress[1];
      gameCoord.keyPress[0] = gameCoord.keyPress[2];
      gameCoord.keyPress[1] = gameCoord.keyPress[3];
      gameCoord.keyPress[2] = tmpUp;
      gameCoord.keyPress[3] = tmpDown;
    }
    gameCoord.time += serverClientTimeDiff;
    gameCoord.ballSpeedX = 0;
    gameCoord.ballSpeedY = 0;
    gameCoord.paddleSpeed = 0;
    setCoords(gameCoord);
    update(Date.now(), gameCoord.time);
  };

  const finishEventHandler = (scoreInfo: scoreInfo) => {
    console.log("finished!!!!!!");
    if (isP1) {
      player1.score = scoreInfo.p1Score;
      player2.score = scoreInfo.p2Score;
    } else {
      player1.score = scoreInfo.p2Score;
      player2.score = scoreInfo.p1Score;
    }
    if (player1.score > player2.score) {
      setGameWinner(player1.uid);
    } else {
      setGameWinner(player2.uid);
    }
    setGameResultModal(true);
    clearInterval(pingInterval);
  };

  const countdownEventHandler = () => {
    AdminLogPrinter(adminConsole, "countdown!!!");
  }

  useEffect(() => {
    gameSocket.on("syncData", syncDataHandler);
    gameSocket.on("scoreInfo", scoreEventHandler);
    gameSocket.on("finished", finishEventHandler);
    gameSocket.on("countdown", countdownEventHandler);
    return () => {
      gameSocket.off("syncData", syncDataHandler);
      gameSocket.off("scoreInfo", scoreEventHandler);
      gameSocket.off("finished", finishEventHandler);
      gameSocket.off("countdown", countdownEventHandler);
    };
  }, []);

  useEffect(() => {
    console.log(`cnt: ${cnt}`);
  }, [cnt]);

  useEffect(() => {
    setCnt(cnt + 1);
    requestAnimationLoop(Date.now(), lastUpdateTime);
    return () => {
      setCnt(cnt - 1);
      cancelAnimationFrame(requestAnimationId);
    }
  }, []);
  //   console.log("coords updated!!!!");

  // // the connection is denied by the server in a middleware function
  // gameSocket.on("connect_error", (err) => {
  //   if (err.message === "unauthorized") {
  //     // handle each case
  //   }
  //   console.log(err.message); // prints the message associated with the error
  // });

  function requestAnimationLoop(curTime: number, lastUpdate: number) {
    if (coords.keyPress !== null) {
      update(curTime, lastUpdate);
    }
    requestAnimationId = requestAnimationFrame(() => requestAnimationLoop(Date.now(), lastUpdateTime));
  }

  // paddle update first, and then ball position update.
  function update(curTime: number, lastUpdate: number) {
    const dt = curTime - lastUpdate;
    if (dt > 0) {
      const keyPressDt: number[] = getKeyPressDt(curTime);

      paddleUpdate(keyPressDt);
      coords.ballX += coords.ballSpeedX * dt;
      coords.ballY += coords.ballSpeedY * dt;
      const isHitY = collisionCheckY();
      const isHitX = collisionCheckX();
      if (isHitY !== Direction.NONE) {
        if (isHitY === Direction.UP) {
          coords.ballY = 2 * ball.radius - coords.ballY;
          coords.ballSpeedY = -coords.ballSpeedY;
        } else {
          coords.ballY = 2 * (HEIGHT - ball.radius) - coords.ballY;
          coords.ballSpeedY = -coords.ballSpeedY;
        }
      }
      if (isHitX !== Direction.NONE) {
        if (isHitX === Direction.LEFT) {
          if (collisionCheckP1Paddle() === Hit.PADDLE) {
            coords.ballX = 2 * (ball.radius + paddle.width) - coords.ballX;
            coords.ballSpeedX = -coords.ballSpeedX;
          }
        } else {
          if (collisionCheckP2Paddle() === Hit.PADDLE) {
            coords.ballX = 2 * (WIDTH - ball.radius - paddle.width) - coords.ballX;
            coords.ballSpeedX = -coords.ballSpeedX;
          }
        }
      }
      lastUpdateTime = curTime;
      Game(coords, canvas);
    }
  }

  function getKeyPressDt(curTime: number): number[] {
    const keyPressDt: number[] = [];
    for (let i = 0; i < 4; i++) {
      if (coords.keyPress[i] !== 0 && curTime > coords.keyPress[i]) {
        keyPressDt.push(curTime - coords.keyPress[i]);
        coords.keyPress[i] = curTime;
      } else {
        keyPressDt.push(0);
      }
    }
    return keyPressDt;
  }

  function paddleUpdate(keyPressDt: number[]) {
    if (keyPressDt[0] !== 0) {
      if (coords.paddle1Y > 0) {
        coords.paddle1Y -= coords.paddleSpeed * keyPressDt[0];
      }
      if (coords.paddle1Y < 0) {
        coords.paddle1Y = 0;
      }
    }
    if (keyPressDt[1] !== 0) {
      if (coords.paddle1Y < HEIGHT - paddle.height) {
        coords.paddle1Y += coords.paddleSpeed * keyPressDt[1];
      }
      if (coords.paddle1Y > HEIGHT - paddle.height) {
        coords.paddle1Y = HEIGHT - paddle.height;
      }
    }
    if (keyPressDt[2] !== 0) {
      if (coords.paddle2Y > 0) {
        coords.paddle2Y -= coords.paddleSpeed * keyPressDt[2];
      }
      if (coords.paddle2Y < 0) {
        coords.paddle2Y = 0;
      }
    }
    if (keyPressDt[3] !== 0) {
      if (coords.paddle2Y < HEIGHT - paddle.height) {
        coords.paddle2Y += coords.paddleSpeed * keyPressDt[3];
      }
      if (coords.paddle2Y > HEIGHT - paddle.height) {
        coords.paddle2Y = HEIGHT - paddle.height;
      }
    }
  }

  function collisionCheckX() {
    if (coords.ballX <= ball.radius + paddle.width) {
      return Direction.LEFT;
    } else if (coords.ballX >= WIDTH - ball.radius - paddle.width) {
      return Direction.RIGHT;
    }
    return Direction.NONE;
  }

  function collisionCheckY() {
    if (coords.ballY >= HEIGHT - ball.radius) {
      return Direction.DOWN;
    } else if (coords.ballY <= ball.radius) {
      return Direction.UP;
    }
    return Direction.NONE;
  }

  function collisionCheckP1Paddle() {
    if (coords.ballY >= coords.paddle1Y && coords.ballY <= coords.paddle1Y + paddle.height) {
      return Hit.PADDLE;
    }
    return Hit.WALL;
  }

  function collisionCheckP2Paddle() {
    if (coords.ballY >= coords.paddle2Y && coords.ballY <= coords.paddle2Y + paddle.height) {
      return Hit.PADDLE;
    }
    return Hit.WALL;
  }

  useEffect(() => {
    // init
    player1.score = 0;
    player2.score = 0;
    Game(coords, canvas);
  }, []);

  useEffect(() => {
    function handleKeyPress(event: globalThis.KeyboardEvent) {
      if (event.code === "ArrowUp") {
        event.preventDefault();
        if (!upArrow) {
          setUpArrow(true);
          gameSocket.emit("upPress");
          AdminLogPrinter(adminConsole, "up press");
        }
      } else if (event.code === "ArrowDown") {
        event.preventDefault();
        if (!downArrow) {
          setDownArrow(true);
          gameSocket.emit("downPress");
          AdminLogPrinter(adminConsole, "down press");
        }
      }
    }

    function handleKeyRelease(event: globalThis.KeyboardEvent) {
      if (event.code === "ArrowUp") {
        event.preventDefault();
        if (upArrow) {
          setUpArrow(false);
          gameSocket.emit("upRelease");
          AdminLogPrinter(adminConsole, "up release");
        }
      } else if (event.code === "ArrowDown") {
        event.preventDefault();
        if (downArrow) {
          setDownArrow(false);
          gameSocket.emit("downRelease");
          AdminLogPrinter(adminConsole, "down release");
        }
      }
    }
    window.addEventListener("keydown", handleKeyPress);
    window.addEventListener("keyup", handleKeyRelease);

    return () => {
      window.removeEventListener("keydown", handleKeyPress);
      window.removeEventListener("keyup", handleKeyRelease);
    };
  }, [upArrow, downArrow]);

  return (
    <div className="QueueBackGround">
      <canvas ref={canvas} id="pong" width={1150} height={600}></canvas>
    </div>
  );
}
