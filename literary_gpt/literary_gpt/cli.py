import argparse
from literary_gpt.memory import VectorMemory

def main():
    parser = argparse.ArgumentParser(prog="literary_gpt")
    subparsers = parser.add_subparsers(dest="command")

    # memory_add
    mem_parser = subparsers.add_parser("memory_add")
    mem_parser.add_argument("--text", required=True)
    mem_parser.add_argument("--type", required=True)
    mem_parser.add_argument("--summary", required=True)

    args = parser.parse_args()

    if args.command == "memory_add":
        mem = VectorMemory()
        mem_id = mem.add_memory(args.text, args.type, args.summary)
        print(f"Memory added with ID: {mem_id}")

if __name__ == "__main__":
    main()