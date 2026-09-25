import nextPlugin from "@next/eslint-plugin-next";
import typescriptParser from "@typescript-eslint/parser";

export default [
	{
		files: ["src/**/*.{ts,tsx}"],
		languageOptions: {
			parser: typescriptParser,
			parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } }
		},
		plugins: { "@next/next": nextPlugin },
		rules: nextPlugin.configs["core-web-vitals"].rules
	}
];