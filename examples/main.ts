import { Blotter, Material, Text } from "blotter.ts";
import {
  ChannelSplitMaterial,
  FliesMaterial,
  LiquidDistortMaterial,
  RollingDistortMaterial,
  SlidingDoorMaterial,
} from "blotter.ts/materials";

const app = document.getElementById("app");
if (!app) throw new Error("#app missing");

function demo(
  title: string,
  material: Material,
  value = "Blotter",
): {
  blotter: Blotter;
  text: Text;
  section: HTMLElement;
} {
  const section = document.createElement("section");
  const heading = document.createElement("h2");
  heading.textContent = title;
  section.appendChild(heading);
  app?.appendChild(section);

  const text = new Text(value, {
    family: "serif",
    size: 80,
    fill: "#f2efe6",
    padding: 40,
  });
  const blotter = new Blotter(material, { texts: text });
  blotter.forText(text)?.appendTo(section);
  return { blotter, text, section };
}

demo("Default (passthrough)", new Material());

// ChannelSplit with a live uniform slider proving runtime uniform updates.
{
  const material = new ChannelSplitMaterial();
  const { section } = demo("ChannelSplit", material);

  const controls = document.createElement("div");
  controls.className = "controls";
  const label = document.createElement("label");
  label.textContent = "uOffset";
  const slider = document.createElement("input");
  slider.type = "range";
  slider.min = "0";
  slider.max = "0.3";
  slider.step = "0.005";
  slider.value = String(material.uniforms.uOffset?.value ?? 0.05);
  slider.addEventListener("input", () => {
    const uOffset = material.uniforms.uOffset;
    if (uOffset) uOffset.value = Number(slider.value);
  });
  label.appendChild(slider);
  controls.appendChild(label);
  section.appendChild(controls);
}

demo("Flies", new FliesMaterial());
demo("LiquidDistort", new LiquidDistortMaterial());
demo("RollingDistort", new RollingDistortMaterial());
demo("SlidingDoor", new SlidingDoorMaterial());

// Text mutation triggers a full atlas rebuild.
{
  const { text, section } = demo(
    "Mutable text",
    new LiquidDistortMaterial(),
    "Edit me",
  );
  const controls = document.createElement("div");
  controls.className = "controls";
  const input = document.createElement("input");
  input.type = "text";
  input.value = text.value;
  const button = document.createElement("button");
  button.textContent = "Update text";
  button.addEventListener("click", () => {
    text.value = input.value || "Edit me";
  });
  controls.appendChild(input);
  controls.appendChild(button);
  section.appendChild(controls);
}
