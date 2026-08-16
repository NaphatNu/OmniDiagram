import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { KindBadge } from "./KindBadge";

describe("KindBadge", () => {
  it("renders SchemaDiagram", () => {
    render(<KindBadge kind="SchemaDiagram" />);
    expect(screen.getByText("SchemaDiagram")).toBeInTheDocument();
  });

  it("renders GenericDiagram", () => {
    render(<KindBadge kind="GenericDiagram" />);
    expect(screen.getByText("GenericDiagram")).toBeInTheDocument();
  });
});
