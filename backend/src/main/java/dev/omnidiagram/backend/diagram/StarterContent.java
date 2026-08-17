package dev.omnidiagram.backend.diagram;

public final class StarterContent {

	private StarterContent() {
	}

	public static String forKind(DiagramKind kind) {
		return switch (kind) {
			case SchemaDiagram -> "Table table_name {\n  id integer [primary key]\n}\n";
			case GenericDiagram -> "flowchart TD\n  Start --> End\n";
		};
	}
}
