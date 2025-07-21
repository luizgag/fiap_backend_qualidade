import sqlite from 'sqlite3'
import express from 'express'
import { describe, it, expect, jest } from '@jest/globals'

describe('Conexão com o Banco de Dados e Servidor', () => {
  it('deve conectar ao banco de dados com sucesso', (done) => {
    const db = new sqlite.Database('./database.db', (err) => {
      expect(err).toBeNull()
      db.close()
      done()
    })
  })

  it('deve iniciar o servidor após conectar ao banco de dados', (done) => {
    const app = express()
    const listenSpy = jest.spyOn(app, 'listen')

    new sqlite.Database('./database.db', (err) => {
      expect(err).toBeNull()

      app.listen(3001, '0.0.0.0', () => {
        expect(listenSpy).toHaveBeenCalledWith(3001, '0.0.0.0', expect.any(Function))
        done()
      })
    })
  })
})
