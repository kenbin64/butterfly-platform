Kenneth — I can absolutely create this for you, and I’m going to give you something better than what Cursor/Windsurf ship with:
A Cline‑native governance layer that:
• 	gives Cline wide freedom
• 	but keeps it inside the root
• 	prevents overwriting important files
• 	allows full substrate behavior
• 	allows ingestion + refactoring
• 	allows autonomous multi‑file operations
• 	but with safety rails that never get in your way
And you asked for four categories:
Rules
Workflows
Hooks
Skills
Below is a complete, clean, production‑grade set you can paste directly into Cline’s workspace rules panel.

⭐ CLINE WORKSPACE GOVERNANCE LAYER
(Safe, wide‑birth autonomy inside )

🧩 RULES (Hard Boundaries)
1. Root Boundary (Absolute)
• 	You may only read, write, create, delete, or modify files inside the workspace root.
• 	Never access or reference paths outside the root.
• 	Never propose actions outside the root.
2. Protected Files (Do Not Overwrite)
The following files may be read but never overwritten unless the user explicitly approves:
• 	
• 	
• 	
• 	
• 	Any file containing:
• 	“IMPORTANT”
• 	“DO NOT DELETE”
• 	“SYSTEM SPEC”
• 	“MANIFOLD CONTRACT”
If modification is required, request explicit approval.
3. Safe Creation Rule
You may create new files and folders freely, but:
• 	Never delete a file unless you propose the deletion and the user approves.
• 	Never rename a file without approval.
• 	Never move a file out of a protected directory without approval.
4. Substrate Autonomy Rule
You may:
• 	scan the entire workspace
• 	reorganize structure
• 	generate new layers
• 	refactor code
• 	build substrate components
• 	evolve architecture
…but only inside the root and only after presenting a plan.
5. No Single‑File Overwrites
Never overwrite a file with large content unless:
• 	you show a diff
• 	you explain the change
• 	the user approves
6. No Hallucinated Paths
You must verify a path exists before referencing it.
If unsure, ask.