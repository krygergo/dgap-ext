# DGAP VSCode Extension

The purpose of this extension is to offer a straightforward and informative interface for using the distributed graph algorithm playground [DGAP](https://github.com/krygergo/dgap).

## Usage

The extension engages with the Erlang application by offering user specific commands used to create data for the application's processing. This data is generated through a dgap.json file and then communicated through interaction with the webview generated during a simulation.

### Commands

#### DGAP: Start

Initiates the Erlang process within the VS Code environment as a child process. A window information message displays "Erlang process ready" upon the process being ready for communication.

#### DGAP: Stop

Terminates the Erlang process and discards previous progress.

#### DGAP: Compile

Reads the compile property from the dgap.json file. It then compiles and loads the provided .erl file into an graph algorithm.

#### DGAP: Simulate

Reads the simulate property from the dgap.json file. It then starts a new graph simulation running the specified algorithm on a chosen topology.

#### DGAP: Observer

Initiates the observer and connects it to the Erlang child process. The observer is not included in the shipped extension ERTS. To use the observer command, the erl_call module, which is part of the general Erlang/OTP, must be installed.

### Configuring

At the root of the open folder/workspace in vscode there must exist a dgap.json file. The extension expects two different properties inside the file.

    {
        "compile": {
            "file": the file leading to the .erl file intended for compilation into an algorithm,
        },
        "simulate": {
            "module": the name of the module that implements the desired algorithm,
            "fun": the implemented function that starts the algorithm,
            "topology": {
                "type": ring, complete or random,
                "size": the number of vertices in the graph,
                "alpha": if the topology type is random "alpha" should be configured as a decimal number ranging from -1, representing no edges between vertices, to 1, akin to a complete graph.
            }
        }
    }

![Imgur](https://i.imgur.com/wooExVW.png)
<div align="right">An image of how such a configuration might resemble</div>

### Example

#### hello_world.erl

    -module(hello_world).

    -export([start/1]).

    start(_Args) ->
        log("Hello World!"),
        hello_world.

Running consecutive commands in the command palette

    DGAP: start
    DGAP: compile
    DGAP: simulate

Yields the graph simulation

![Imgur](https://i.imgur.com/E6NAM62.png)

The orange-colored dots, each marked with an ID label, represent individual vertices in the graph. Links between these vertices are visualized by white edges. These edges can be clicked to remove the link between the vertices. A removed link is visualized by the edge turning red.

The right panel contains three different information types:
- message - lists messages sent between vertices in the graph
- result - lists the returned result or error when/if a vertex finish its execution
- log - lists logs from the bif log function
