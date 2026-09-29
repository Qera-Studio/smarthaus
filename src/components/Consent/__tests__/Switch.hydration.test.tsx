// A toggle made before hydration is kept. The switch is server-rendered on
// /cookie-preferences, so a visitor can flip it before React arrives; React
// used to set it back to its own state, silently discarding the choice.
import { act } from "@testing-library/react";
import { useState } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { Switch } from "../Switch";

function Harness({ initial, onSeen }: { initial: boolean; onSeen: (on: boolean) => void }) {
  const [on, setOn] = useState(initial);
  return (
    <>
      <span id="label">Analytics</span>
      <Switch
        id="s"
        labelId="label"
        checked={on}
        onChange={(next) => {
          onSeen(next);
          setOn(next);
        }}
      />
    </>
  );
}

function serverRender(initial: boolean) {
  const container = document.createElement("div");
  container.innerHTML = renderToString(<Harness initial={initial} onSeen={() => {}} />);
  document.body.append(container);
  return { container, input: container.querySelector("input")! };
}

async function hydrate(container: HTMLElement, initial: boolean, onSeen = jest.fn()) {
  await act(async () => {
    hydrateRoot(container, <Harness initial={initial} onSeen={onSeen} />);
  });
  return onSeen;
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Switch across hydration", () => {
  it("keeps a switch turned on before hydration, and reports it", async () => {
    const { container, input } = serverRender(false);
    input.checked = true; // the visitor's tap, before React arrives
    const seen = await hydrate(container, false);
    expect(input.checked).toBe(true);
    expect(seen).toHaveBeenCalledWith(true);
  });

  it("keeps a switch turned off before hydration", async () => {
    const { container, input } = serverRender(true);
    input.checked = false;
    const seen = await hydrate(container, true);
    expect(input.checked).toBe(false);
    expect(seen).toHaveBeenCalledWith(false);
  });

  it("reports nothing when nobody touched it before hydration", async () => {
    const { container, input } = serverRender(false);
    const seen = await hydrate(container, false);
    expect(input.checked).toBe(false);
    expect(seen).not.toHaveBeenCalled();
  });

  it("never adopts a change into a disabled switch", async () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(
      <Switch id="e" labelId="l" checked disabled onChange={() => {}} />,
    );
    document.body.append(container);
    container.querySelector("input")!.checked = false;
    const onChange = jest.fn();
    await act(async () => {
      hydrateRoot(container, <Switch id="e" labelId="l" checked disabled onChange={onChange} />);
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});
