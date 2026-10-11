export const CSE_SUBJECTS = {
    "Data Structures & Algorithms": ["Complexity analysis", "Arrays and strings", "Hashing", "Stacks and queues", "Linked lists", "Trees and heaps", "Graphs", "Searching and sorting", "Recursion and backtracking", "Dynamic programming"],
    "Database Management Systems": ["Relational model and keys", "ER modeling", "Normalization", "Transactions and ACID", "Concurrency control", "Indexes", "Query processing", "Recovery and logging", "Database design"],
    "SQL & Querying": ["SELECT and filtering", "Joins", "Grouping and aggregation", "Subqueries and CTEs", "Window functions", "NULL and three-valued logic", "Indexes and query plans", "Transactions and constraints"],
    "Operating Systems": ["Processes and threads", "Scheduling", "Synchronization", "Deadlocks", "Memory management", "Virtual memory", "File systems", "I/O and system calls"],
    "Computer Networks": ["OSI and TCP/IP models", "Ethernet and switching", "IP addressing and subnetting", "Routing", "TCP and UDP", "DNS and HTTP", "TLS and security", "Congestion and reliability"],
    "Object-Oriented Programming": ["Encapsulation and abstraction", "Inheritance and composition", "Polymorphism", "Interfaces and contracts", "SOLID principles", "Design patterns", "Error handling", "Testing and maintainability"],
    "Computer Organization & Architecture": ["Number systems and representation", "Boolean logic", "Instruction sets", "CPU datapath and control", "Pipelining", "Cache and memory hierarchy", "I/O systems", "Performance metrics"],
    "Theory of Computation": ["Regular languages and finite automata", "Regular expressions", "Context-free grammars", "Pushdown automata", "Turing machines", "Decidability", "Reductions", "Time and space complexity"],
    "Compiler Design": ["Lexical analysis", "Parsing and grammars", "Syntax-directed translation", "Semantic analysis", "Intermediate representations", "Optimization", "Register allocation", "Code generation"],
    "Discrete Mathematics": ["Logic and proof techniques", "Sets and relations", "Functions", "Combinatorics", "Recurrence relations", "Graph theory", "Trees", "Probability basics"],
    "Software Engineering": ["Requirements and specifications", "Architecture and design", "Version control and collaboration", "Testing strategy", "CI/CD", "Reliability and observability", "Security practices", "Project trade-offs"],
    "Programming Languages": ["Type systems", "Scope and closures", "Memory management", "Evaluation strategies", "Concurrency models", "Generics and polymorphism", "Runtime systems", "Language design trade-offs"],
    "Distributed Systems": ["Time and ordering", "Replication", "Consistency models", "Consensus", "Partitioning and sharding", "Fault tolerance", "Distributed transactions", "Observability and operations"],
    "Cybersecurity": ["Threat modeling", "Authentication and authorization", "Cryptography fundamentals", "Web application security", "Network security", "Secure coding", "Vulnerability management", "Incident response"],
    "Artificial Intelligence & Machine Learning": ["Search and state spaces", "Probability and inference", "Supervised learning", "Model evaluation", "Overfitting and regularization", "Feature engineering", "Neural network fundamentals", "Ethics and data quality"],
} as const;

export type CSESubject = keyof typeof CSE_SUBJECTS;

export function isCSESubject(value: string): value is CSESubject {
    return Object.prototype.hasOwnProperty.call(CSE_SUBJECTS, value);
}
