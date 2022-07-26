import React, { useEffect, useState } from 'react';
import * as backend from './build/index.main.mjs';
import { loadStdlib } from '@reach-sh/stdlib';

const stdlib = loadStdlib(process.env)
let acc
const connector = stdlib.connector

function App() {

  const [state, setState_] = useState({view: "init"})
  const setState = (arg) => {setState_((prev) => ({...prev, ...arg}))}

  const Player = {
    ...stdlib.hasRandom,
    getHand: async () => {
      const hand = await new Promise(resolveHandPromise => {
        setState({view: "playHand", resolveHandPromise})
      })
      setState({view: "waiting2"})
      return hand
    },
    seeOutcome: (outcome) => {
      const parsedOutcome = parseInt(outcome._hex)
      setState({view: "seeOutcome", outcome: parsedOutcome})
    },
    informTimeout: () => {
      setState({view: "timeout"})
    }
  }

  useEffect(() => {
    const func = async () => {
      acc = await stdlib.getDefaultAccount();
      const balAtomic = await stdlib.balanceOf(acc);
      const bal = stdlib.formatCurrency(balAtomic, 4);
      setState({acc, bal});
      if (await stdlib.canFundFromFaucet()) {
        setState({view: 'fundAccount'});
      } else {
        setState({view: 'deployerOrAttacher'});
      }
    }
    func()
  },
  [])

  return (
    <div className="App" style={{display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh"}}>
      <h1>Rock, Paper, Scissors</h1>
      {
        (state.role !== undefined) &&
        <h2>{state.role}</h2>
      }
      {
        (state.view === "init") ?
        <span>Please wait while we connect to your account. If this takes more thana few seconds, there may be something wrong.</span> :

        (state.view === "fundAccount") ?
        <>
          <h2>Fund Account</h2>
          <hr/>
          <span>{`Would you like to fund your account with additional ${connector}?`}</span>
          <span>This only works on certain devnets</span>
          <div style={{display: "flex"}}>
            <input type="number" placeholder={10} id="fundAccountInput"></input>
            <button onClick={async (e) => {
              const inputEle = document.getElementById("fundAccountInput")
              inputEle.disabled = true
              e.target.disabled = true
              await stdlib.fundFromFaucet(acc, Number(inputEle.value))
              setState({view: "deployerOrAttacher"})
            }}>Fund Account</button>
            <button onClick={() => {
              setState({view: "deployerOrAttacher"})
            }}>Skip</button>
          </div>
        </> :

        (state.view === "deployerOrAttacher") ?
        <>
          <span>Please select a role:</span>
          <button onClick={() => {setState({role: "Deployer (Alice)", view: "setWager"})}}>Deployer</button>
          <span>Set the wager, deploy the contract.</span>
          <button onClick={() => {setState({role: "Attacher (Bob)", view: "getContract"})}}>Attacher</button>
          <span>Attach to the Deployer's contract.</span>
        </> :

        (state.view === "setWager") ?
        <>
          <div style={{display: "flex"}}>
            <input type="number" id="setWagerInput"></input>
            <span>{connector}</span>
          </div>
          <button id="setWager" onClick={async () => {
            setState({view: "deploying"})
            const ctc = acc.contract(backend)
            const aliceInteract = {
              ...Player,
              wager: Number(document.getElementById("setWagerInput").value),
              deadline: (connector === "ETH") ? 10 : (connector === "ALGO") ? 100 : 1000
            }
            ctc.p.Alice(aliceInteract)
            const ctcInfo = await ctc.getInfo()
            setState({view: "waitingForAttacher", ctcInfo})
          }}>Set Wager and Deploy</button>
        </> :

        (state.view === "deploying") ?
        <span>Deploying... Please wait.</span> :

        (state.view === "waitingForAttacher") ?
        <>
          <span>Waiting for Attacher to join...</span>
          <span>Please give them this contract info:</span>
          <span>{state.ctcInfo}</span>
        </> :

        (state.view === "getContract") ?
        <>
          <span>Please paste the contract info to attach to:</span>
          <textarea spellCheck={false} id="getContractInput"></textarea>
          <button onClick={(e) => {
            let ctc
            try {
              ctc = acc.contract(backend, JSON.parse(document.getElementById("getContractInput").value))
            } catch {
              ctc = acc.contract(backend, document.getElementById("getContractInput").value)
            }
            const bobInteract = {
              ...Player,
              acceptWager: async (wager) => {
                setState({view: "acceptWager", wager})
                await new Promise((res) => {
                  const buttonEle = document.getElementById("acceptWager")
                  buttonEle.addEventListener("click", () => {
                    res()
                  })
                })
                setState({view: "waiting"})
              }
            }
            ctc.p.Bob(bobInteract)
          }}>Attach</button>
        </> :

        (state.view === "acceptWager") ?
        <>
          <span>The terms of the game are:</span>
          <span>{`Wager: ${state.wager} ${connector}`}</span>
          <button id="acceptWager">Accept Terms and Pay Wager</button>
        </> :

        (state.view === "waiting") ?
        <>
          <span>Waiting for the other player...</span>
          <span>Think about which move you want to play.</span>
        </> :

        (state.view === "playHand") ?
        <div style={{display: "flex"}}>
          <button id="play-rock" onClick={() => {state.resolveHandPromise(0)}}>Rock</button>
          <button id="play-paper" onClick={() => {state.resolveHandPromise(1)}}>Paper</button>
          <button id="play-scissors" onClick={() => {state.resolveHandPromise(2)}}>Scissors</button>
        </div> :

        (state.view === "waiting2") ?
        <span>Waiting for results...</span> :

        (state.view === "seeOutcome") ?
        <>
          <span>Thank you for playing. The outcome of this game was:</span>
          <span>{state.outcome === 2 ? "Alice wins!" : state.outcome === 0 ? "Bob wins!" : "Draw!"}</span>
        </> :

        (state.view === "informTimeout") ?
        <span>There's been a timeout. Someone took too long.</span> :

        <></>

      }
    </div>
  )
}

export default App
