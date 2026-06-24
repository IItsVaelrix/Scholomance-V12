import os
from data.preprocess import load_and_preprocess, split_dataset
from transformers import AutoTokenizer, AutoModelForCausalLM, Trainer, TrainingArguments, TextDataset, DataCollatorForLanguageModeling

def train_model(data_path: str, model_name: str = "microsoft/DialoGPT-small", epochs: int = 1):
    """
    Minimal MVP training loop using Hugging Face Trainer.
    Prepares a causal language modeling dataset from conversational data.
    """
    print(f"Loading data from {data_path}...")
    dataset = load_and_preprocess(data_path)
    train_data, val_data = split_dataset(dataset)
    
    print(f"Loaded {len(train_data)} training samples and {len(val_data)} validation samples.")
    
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(model_name)
    
    # Save formatted data to text files for TextDataset
    with open("train_tmp.txt", "w") as f:
        for d in train_data:
            f.write(tokenizer.eos_token.join(d["history"] + [d["response"]]) + tokenizer.eos_token + "\n")
            
    with open("val_tmp.txt", "w") as f:
        for d in val_data:
            f.write(tokenizer.eos_token.join(d["history"] + [d["response"]]) + tokenizer.eos_token + "\n")
            
    train_dataset = TextDataset(tokenizer=tokenizer, file_path="train_tmp.txt", block_size=128)
    val_dataset = TextDataset(tokenizer=tokenizer, file_path="val_tmp.txt", block_size=128)
    
    data_collator = DataCollatorForLanguageModeling(tokenizer=tokenizer, mlm=False)
    
    training_args = TrainingArguments(
        output_dir="./chatbot_checkpoint",
        overwrite_output_dir=True,
        num_train_epochs=epochs,
        per_device_train_batch_size=4,
        save_steps=500,
        save_total_limit=2,
        prediction_loss_only=True,
    )
    
    trainer = Trainer(
        model=model,
        args=training_args,
        data_collator=data_collator,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
    )
    
    print("Starting training...")
    trainer.train()
    
    print("Saving model to ./chatbot_checkpoint/final")
    trainer.save_model("./chatbot_checkpoint/final")
    tokenizer.save_pretrained("./chatbot_checkpoint/final")
    
    # Cleanup
    os.remove("train_tmp.txt")
    os.remove("val_tmp.txt")

if __name__ == "__main__":
    train_model("data/toy_data.jsonl")
