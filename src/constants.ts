import { Connection, Keypair } from "@solana/web3.js";
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";
import { Web3Storage } from "web3.storage";
import base58 from "bs58";
import "dotenv/config";

export const connection = new Connection(process.env.RPC_URL!);
export const payer = Keypair.fromSecretKey(
  base58.decode(process.env.PAYER_PRIVATE_KEY!)
);
export const metaplex = Metaplex.make(connection).use(keypairIdentity(payer));
export const web3Storage = new Web3Storage({
  token: process.env.WEB3_STORAGE_API_KEY!,
});

export const CURRENT_CHUNK = "data/19.json";
