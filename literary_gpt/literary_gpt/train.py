import yaml
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer, Trainer, TrainingArguments
from literary_gpt.dataset import LiteraryDataset

def train(config_path: str, data_path: str):
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Training on {device}")

    tokenizer = AutoTokenizer.from_pretrained(config['model_name'])
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    model = AutoModelForCausalLM.from_pretrained(config['model_name'])
    
    use_peft = config.get("use_peft", True)
    if use_peft:
        try:
            from peft import get_peft_model, LoraConfig, TaskType
            peft_config = LoraConfig(
                task_type=TaskType.CAUSAL_LM,
                inference_mode=False,
                r=8,
                lora_alpha=32,
                lora_dropout=0.1
            )
            model = get_peft_model(model, peft_config)
            print("PEFT/LoRA enabled. Training adapters only.")
            model.print_trainable_parameters()
        except ImportError:
            print("PEFT library not found. Falling back to full fine-tuning.")
    else:
        print("Full fine-tuning selected.")

    model.to(device)

    dataset = LiteraryDataset(data_path, tokenizer, max_length=config['max_length'])
    
    training_args = TrainingArguments(
        output_dir=config['output_dir'],
        per_device_train_batch_size=config['batch_size'],
        gradient_accumulation_steps=config['gradient_accumulation_steps'],
        learning_rate=float(config['learning_rate']),
        num_train_epochs=config['epochs'],
        fp16=config.get('fp16', False) and torch.cuda.is_available(),
        save_steps=config['save_steps'],
        logging_steps=50,
    )

    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset,
    )

    trainer.train()
    model.save_pretrained(f"{config['output_dir']}/final")
    tokenizer.save_pretrained(f"{config['output_dir']}/final")
    print("Training complete.")

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    parser.add_argument("--data", required=True)
    args = parser.parse_args()
    train(args.config, args.data)