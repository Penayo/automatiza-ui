interface ImportMeta {  
	glob: (pattern: string) => Promise<{ [key: string]: any }>;  
}
