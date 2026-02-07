'use client';

import { useState, useEffect } from 'react';

const DEV_GREETINGS = [
  "cd ~/workspace/dashboard && make magic",
  "git commit -m \"another productive day\"",
  "npm run build && ./deploy.sh --force",
  "docker-compose up -d --build",
  "ssh patrick@production-server -p 22",
  "grep -r \"solution\" ./problems",
  "sudo chmod +x productivity.sh",
  "kubectl get pods -n life-goals",
  "vim README.md # documenting greatness",
  "python3 -m venv success_env",
  "curl -X GET https://api.success.com/v1/goals",
  "ls -la /dev/brain | grep 'ideas'",
  "cat ~/.ssh/id_rsa.pub | pbcopy",
  "terraform apply -auto-approve",
  "cargo build --release",
  "go run main.go # let's build something",
  "ps aux | grep 'motivation'",
  "alias coffee='brew install energy'",
  "rm -rf ./procrastination",
  "ping -c 4 8.8.8.8 # checking connectivity"
];

export default function DevGreeting() {
  const [greeting, setGreeting] = useState<string>("");

  useEffect(() => {
    const randomGreeting = DEV_GREETINGS[Math.floor(Math.random() * DEV_GREETINGS.length)];
    setGreeting(randomGreeting);
  }, []);

  if (!greeting) return <div className="h-7 w-64 animate-pulse bg-white/5 rounded"></div>;

  return (
    <p className="text-xl font-mono text-zinc-400">
      <span className="text-emerald-500">$</span> {greeting}
    </p>
  );
}
