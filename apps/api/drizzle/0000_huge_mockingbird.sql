CREATE TABLE `anotacoes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`materia_id` integer,
	`documento_id` integer,
	`titulo` text,
	`conteudo_html` text DEFAULT '' NOT NULL,
	`conteudo_texto` text DEFAULT '' NOT NULL,
	`criado_em` text DEFAULT (datetime('now')) NOT NULL,
	`atualizado_em` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`materia_id`) REFERENCES `materias`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`documento_id`) REFERENCES `documentos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_anotacoes_documento` ON `anotacoes` (`documento_id`);--> statement-breakpoint
CREATE INDEX `idx_anotacoes_materia` ON `anotacoes` (`materia_id`);--> statement-breakpoint
CREATE TABLE `cache_ia` (
	`chave` text PRIMARY KEY NOT NULL,
	`tarefa` text NOT NULL,
	`modelo` text NOT NULL,
	`resposta` text NOT NULL,
	`criado_em` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `destaques` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`documento_id` integer NOT NULL,
	`pagina` integer NOT NULL,
	`cor` text DEFAULT 'amarelo' NOT NULL,
	`texto` text DEFAULT '' NOT NULL,
	`comentario` text,
	`posicao` text NOT NULL,
	`lembrete` text,
	`lembrete_em` text,
	`lembrete_concluido` integer DEFAULT false NOT NULL,
	`criado_em` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`documento_id`) REFERENCES `documentos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_destaques_documento` ON `destaques` (`documento_id`);--> statement-breakpoint
CREATE INDEX `idx_destaques_lembrete` ON `destaques` (`lembrete_em`);--> statement-breakpoint
CREATE TABLE `documentos` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`materia_id` integer NOT NULL,
	`titulo` text NOT NULL,
	`arquivo` text NOT NULL,
	`caminho` text NOT NULL,
	`hash` text NOT NULL,
	`tamanho_bytes` integer DEFAULT 0 NOT NULL,
	`total_paginas` integer DEFAULT 0 NOT NULL,
	`categoria` text,
	`status` text DEFAULT 'pendente' NOT NULL,
	`precisa_ocr` integer DEFAULT false NOT NULL,
	`ultima_pagina` integer,
	`ultima_leitura_em` text,
	`indexado_em` text,
	`criado_em` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`materia_id`) REFERENCES `materias`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `documentos_caminho_unique` ON `documentos` (`caminho`);--> statement-breakpoint
CREATE INDEX `idx_documentos_materia` ON `documentos` (`materia_id`);--> statement-breakpoint
CREATE INDEX `idx_documentos_hash` ON `documentos` (`hash`);--> statement-breakpoint
CREATE INDEX `idx_documentos_leitura` ON `documentos` (`ultima_leitura_em`);--> statement-breakpoint
CREATE TABLE `links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`documento_id` integer NOT NULL,
	`pagina` integer NOT NULL,
	`url` text NOT NULL,
	`texto` text,
	`tipo` text DEFAULT 'desconhecido' NOT NULL,
	`retangulo` text,
	FOREIGN KEY (`documento_id`) REFERENCES `documentos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_links_documento` ON `links` (`documento_id`);--> statement-breakpoint
CREATE TABLE `materias` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`nome` text NOT NULL,
	`semestre` text,
	`codigo` text,
	`caminho` text NOT NULL,
	`criado_em` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `materias_slug_unique` ON `materias` (`slug`);--> statement-breakpoint
CREATE UNIQUE INDEX `materias_caminho_unique` ON `materias` (`caminho`);--> statement-breakpoint
CREATE INDEX `idx_materias_semestre` ON `materias` (`semestre`);--> statement-breakpoint
CREATE TABLE `paginas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`documento_id` integer NOT NULL,
	`numero` integer NOT NULL,
	`texto` text DEFAULT '' NOT NULL,
	`total_caracteres` integer DEFAULT 0 NOT NULL,
	`largura` integer DEFAULT 0 NOT NULL,
	`altura` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`documento_id`) REFERENCES `documentos`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_paginas_doc_num` ON `paginas` (`documento_id`,`numero`);--> statement-breakpoint
CREATE TABLE `preferencias` (
	`chave` text PRIMARY KEY NOT NULL,
	`valor` text NOT NULL,
	`atualizado_em` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `questoes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`documento_id` integer,
	`materia_id` integer,
	`pagina` integer,
	`numero` text,
	`enunciado` text NOT NULL,
	`alternativas` text DEFAULT '[]' NOT NULL,
	`gabarito` text,
	`explicacao` text,
	`origem` text DEFAULT 'manual' NOT NULL,
	`revisada` integer DEFAULT false NOT NULL,
	`impressao_digital` text NOT NULL,
	`criado_em` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`documento_id`) REFERENCES `documentos`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`materia_id`) REFERENCES `materias`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_questoes_documento` ON `questoes` (`documento_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_questoes_impressao` ON `questoes` (`impressao_digital`);--> statement-breakpoint
CREATE TABLE `respostas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`questao_id` integer NOT NULL,
	`alternativa` text,
	`texto` text,
	`marcacao` text NOT NULL,
	`respondido_em` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`questao_id`) REFERENCES `questoes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_respostas_questao` ON `respostas` (`questao_id`);--> statement-breakpoint
CREATE TABLE `snippets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`titulo` text DEFAULT 'Sem titulo' NOT NULL,
	`linguagem` text NOT NULL,
	`codigo` text DEFAULT '' NOT NULL,
	`documento_id` integer,
	`materia_id` integer,
	`pagina` integer,
	`criado_em` text DEFAULT (datetime('now')) NOT NULL,
	`atualizado_em` text DEFAULT (datetime('now')) NOT NULL,
	FOREIGN KEY (`documento_id`) REFERENCES `documentos`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`materia_id`) REFERENCES `materias`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `idx_snippets_documento` ON `snippets` (`documento_id`);