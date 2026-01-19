const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'bolao.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Iniciando migração do banco de dados...');
console.log('📁 Banco de dados:', dbPath);

db.serialize(() => {
    // Adicionar novas colunas à tabela groups
    console.log('\n📝 Adicionando coluna status...');
    db.run(`ALTER TABLE groups ADD COLUMN status TEXT DEFAULT 'open' CHECK(status IN ('open', 'closed', 'checked', 'finalized'))`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Erro ao adicionar coluna status:', err.message);
        } else {
            console.log('✅ Coluna status adicionada/já existe');
        }
    });

    console.log('📝 Adicionando coluna prize_amount...');
    db.run(`ALTER TABLE groups ADD COLUMN prize_amount REAL DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Erro ao adicionar coluna prize_amount:', err.message);
        } else {
            console.log('✅ Coluna prize_amount adicionada/já existe');
        }
    });

    console.log('📝 Adicionando coluna admin_fee_type...');
    db.run(`ALTER TABLE groups ADD COLUMN admin_fee_type TEXT DEFAULT 'percentage' CHECK(admin_fee_type IN ('percentage', 'fixed'))`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Erro ao adicionar coluna admin_fee_type:', err.message);
        } else {
            console.log('✅ Coluna admin_fee_type adicionada/já existe');
        }
    });

    console.log('📝 Adicionando coluna admin_fee_value...');
    db.run(`ALTER TABLE groups ADD COLUMN admin_fee_value REAL DEFAULT 0`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('❌ Erro ao adicionar coluna admin_fee_value:', err.message);
        } else {
            console.log('✅ Coluna admin_fee_value adicionada/já existe');
        }
    });

    // Criar tabela prize_distributions se não existir
    console.log('📝 Criando tabela prize_distributions...');
    db.run(`
        CREATE TABLE IF NOT EXISTS prize_distributions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            group_id INTEGER NOT NULL,
            participant_id INTEGER NOT NULL,
            quota_fraction REAL NOT NULL,
            prize_share REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (group_id) REFERENCES groups(id) ON DELETE CASCADE,
            FOREIGN KEY (participant_id) REFERENCES participants(id) ON DELETE CASCADE,
            UNIQUE(group_id, participant_id)
        )
    `, (err) => {
        if (err) {
            console.error('❌ Erro ao criar tabela prize_distributions:', err.message);
        } else {
            console.log('✅ Tabela prize_distributions criada/já existe');
        }

        // Fechar conexão após todas as operações
        db.close((err) => {
            if (err) {
                console.error('❌ Erro ao fechar banco de dados:', err.message);
            } else {
                console.log('\n✅ Migração concluída com sucesso!');
                console.log('🚀 Agora você pode reiniciar o servidor backend\n');
            }
        });
    });
});
