import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import ts from 'typescript';

// Get all commit hashes and messages
function getAllCommits() {
    return execSync(`git log --pretty=format:"%H %s"`, { encoding: 'utf-8' })
        .trim()
        .split('\n')
        .map(line => {
            const [hash, ...messageParts] = line.split(' ');
            return { hash, message: messageParts.join(' ') };
        });
}

// Get changed files between two commits
function getChangedFiles(commit1, commit2) {
    return execSync(`git diff --name-only ${commit1} ${commit2}`, { encoding: 'utf-8' })
        .trim()
        .split('\n');
}

// Read file content at a specific commit
function getFileContent(commit, file) {
  try {
      return execSync(`git show ${commit}:${file}`, { encoding: 'utf-8' });
  } catch (error) {
      console.warn(`Warning: File ${file} not found in commit ${commit}`);
      return ''; // Return an empty string to avoid crashing
  }
}

// Extract classes, methods, and functions from AST
function extractElements(ast) {
    const elements = { classes: {}, functions: {} };

    function visit(node) {
        if (ts.isClassDeclaration(node) && node.name) {
            const className = node.name.text;
            elements.classes[className] = new Set();
            node.members.forEach(member => {
                if (ts.isMethodDeclaration(member) && member.name) {
                    elements.classes[className].add(member.name.getText());
                }
            });
        } else if (ts.isFunctionDeclaration(node) && node.name) {
            elements.functions[node.name.text] = node.getText();
        }
        ts.forEachChild(node, visit);
    }

    visit(ast);
    return elements;
}

// Compare extracted elements
function compareElements(beforeElements, afterElements) {
    const changes = { added: [], removed: [], modified: [] };

    // Compare classes
    for (const className of Object.keys(beforeElements.classes)) {
        if (!afterElements.classes[className]) {
            changes.removed.push(`Class removed: ${className}`);
        } else {
            // Compare methods
            for (const method of beforeElements.classes[className]) {
                if (!afterElements.classes[className].has(method)) {
                    changes.removed.push(`Method removed: ${className}.${method}`);
                }
            }
            for (const method of afterElements.classes[className]) {
                if (!beforeElements.classes[className].has(method)) {
                    changes.added.push(`Method added: ${className}.${method}`);
                }
            }
        }
    }
    for (const className of Object.keys(afterElements.classes)) {
        if (!beforeElements.classes[className]) {
            changes.added.push(`Class added: ${className}`);
        }
    }

    // Compare functions
    for (const functionName of Object.keys(beforeElements.functions)) {
        if (!afterElements.functions[functionName]) {
            changes.removed.push(`Function removed: ${functionName}`);
        } else if (beforeElements.functions[functionName] !== afterElements.functions[functionName]) {
            changes.modified.push(`Function modified: ${functionName}`);
        }
    }
    for (const functionName of Object.keys(afterElements.functions)) {
        if (!beforeElements.functions[functionName]) {
            changes.added.push(`Function added: ${functionName}`);
        }
    }

    return changes;
}

// Analyze TypeScript changes
function analyzeTsChanges(previous, latest, file) {
    try {
      const beforeContent = getFileContent(previous, file);
      const afterContent = getFileContent(latest, file);

      const beforeAst = ts.createSourceFile('before.ts', beforeContent, ts.ScriptTarget.ESNext, true);
      const afterAst = ts.createSourceFile('after.ts', afterContent, ts.ScriptTarget.ESNext, true);

      const beforeElements = extractElements(beforeAst);
      const afterElements = extractElements(afterAst);

      return compareElements(beforeElements, afterElements);
    } catch (error) {
      return { added: [], removed: [], modified: [] };
    }
}

// Main execution
(function main() {
  const commits = getAllCommits().reverse();
  if (commits.length < 2) {
    console.error("Not enough commits to compare.");
    return;
  }

  console.log("Analyzing all commits in the repository...");

  const allChanges = [];

  // Handle the first commit separately
  const firstCommit = commits[0]; // The first commit is the last in the list
  console.log(`First commit:\n- ${firstCommit.hash}: ${firstCommit.message}`);

  const firstCommitFiles = execSync(
    `git ls-tree -r --name-only ${firstCommit.hash}`,
    { encoding: "utf-8" }
  )
    .trim()
    .split("\n")
    .filter((file) => file.endsWith(".ts") || file.endsWith(".tsx"));

  const firstCommitChanges = {
    latestCommit: firstCommit.hash,
    message: firstCommit.message,
    changes: [],
  };

  for (const file of firstCommitFiles) {
    const content = getFileContent(firstCommit.hash, file);
    const ast = ts.createSourceFile(
      file,
      content,
      ts.ScriptTarget.ESNext,
      true
    );
    const elements = extractElements(ast);

    const added = [];
    for (const className of Object.keys(elements.classes)) {
      added.push(`Class added: ${className}`);
      for (const method of elements.classes[className]) {
        added.push(`Method added: ${className}.${method}`);
      }
    }
    for (const functionName of Object.keys(elements.functions)) {
      added.push(`Function added: ${functionName}`);
    }

    if (added.length > 0) {
      firstCommitChanges.changes.push({
        file,
        added,
        removed: [],
        modified: [],
      });
    }
  }

  if (firstCommitChanges.changes.length > 0) {
    allChanges.push(firstCommitChanges);
  }

  for (let i = 0; i < commits.length - 1; i++) {
    const latest = commits[i + 1];
    const previous = commits[i];
    console.log(
      `Comparing commits:\n- ${latest.hash}: ${latest.message}\n- ${previous.hash}: ${previous.message}`
    );

    const changedFiles = getChangedFiles(previous.hash, latest.hash);
    const tsFiles = changedFiles.filter(
      (file) => file.endsWith(".ts") || file.endsWith(".tsx")
    );
    console.log("Changed files:", tsFiles);

    const commitChanges = {
      latestCommit: latest.hash,
      message: latest.message,
      changes: [],
    };

    for (const file of tsFiles) {
      const changes = analyzeTsChanges(previous.hash, latest.hash, file);
      if (
        changes.added.length > 0 ||
        changes.removed.length > 0 ||
        changes.modified.length > 0
      ) {
        commitChanges.changes.push({
          file,
          added: changes.added,
          removed: changes.removed,
          modified: changes.modified,
        });
      }
    }

    allChanges.push(commitChanges);
  }

  // Write changes to a JSON file
  const outputPath = path.resolve("changes.json");
  fs.writeFileSync(outputPath, JSON.stringify(allChanges, null, 2));
  console.log(`Changes written to ${outputPath}`);
})();
