const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const crypto = require('crypto');

const app = express();
app.use(bodyParser.json());

const SUCCESS = 200;
const PORT = '3000';

// não remova esse endpoint, e para o avaliador funcionar
app.get('/', (_request, response) => {
  response.status(SUCCESS).send();
});

app.listen(PORT, () => { console.log('Online'); });

const crushID = '/crush/:id';
const crushJSON = './crush.json';

const getCrushList = async () => {
  try {
    const file = await fs.readFile(crushJSON, 'utf-8');
    return JSON.parse(file);
  } catch (err) {
    console.error(`Erro ao ler o arquivo: ${err.path}`);
  }
};

app.get('/crush', async (_req, res) => {
  const crushList = await getCrushList();
  if (crushList.length !== 0) {
    res.status(SUCCESS).send(crushList);
  } else {
    res.status(SUCCESS).send([]);
  }
});

app.get(crushID, async (req, res) => {
  const crushList = await getCrushList();
  const { id } = req.params;
  const result = crushList.find((crush) => crush.id === Number(id));
  if (result) {
    res.status(SUCCESS).send(result);
  } else {
    res.status('404').send({
      message: 'Crush não encontrado',
    });
  }
});

const validateToken = (req, res, next) => {
  const token = req.headers.authorization;
  console.log(token);
  if (!token) {
      return res.status(401).send({ message: 'Token não encontrado' });
  }
  if (token.length !== 16) {
    return res.status(401).send({ message: 'Token inválido' });
  }
  next();
};

app.get('./crush/search', validateToken, async (req, res) => {
  const { q } = req.query;
  const crushList = await getCrushList();
  if (!q) {
    return res.status(200).json(crushList);
  }
  const response = crushList.filter((crush) => crush.name.includes(q));
  return res.status(200).json(response);
});

const validateEmail = (email) => {
  const regex = /\S+@\S+\.\S+/;
  return regex.test(email);
};

const validatePassword = (password) => {
  if (password.length >= 6) {
    return true;
  } return false;
};

const generateToken = () => crypto.randomBytes(8).toString('hex');

app.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email) {
    res.status('400').send({ message: 'O campo "email" é obrigatório' });
  } else if (!validateEmail(email)) {
    res.status('400').send({ message: 'O "email" deve ter o formato "email@email.com"' });
  } else if (!password) {
    res.status('400').send({ message: 'O campo "password" é obrigatório' });
  } else if (!validatePassword(password)) {
    res.status('400').send({ message: 'A "senha" deve ter pelo menos 6 caracteres' });
  } else {
    return res.status(SUCCESS).send({ token: `${generateToken()}` });
  }
});

const validateName = (req, res, next) => {
  const { name } = req.body;
  if (!name || name.length === 0) {
    return res.status(400).send({ message: 'O campo "name" é obrigatório' });
  }
  if (name.length < 3) {
    return res.status(400).send({ message: 'O "name" deve ter pelo menos 3 caracteres' });
  }
  next();
};

const validateAge = (req, res, next) => {
  const { age } = req.body;
  if (!age || age.length === 0) {
    return res.status(400).send({ message: 'O campo "age" é obrigatório' });
  }
  if (age < 18) {
    return res.status(400).send({ message: 'O crush deve ser maior de idade' });
  }
  next();
};

const validateRate = (req, res, next) => {
  const { date } = req.body;
  if (date.rate < 1 || date.rate > 5) {
    return res
    .status(400)
    .send({ message: 'O campo "rate" deve ser um inteiro de 1 à 5' });
  }
  next();
};

const validateDate = (req, res, next) => {
  const { date } = req.body;
  if (date === undefined) {
    return res
      .status(400)
      .send({ message: 'O campo "date" é obrigatório e "datedAt" e "rate" não podem ser vazios' });
  }
  if (!date.datedAt || date.rate === undefined) {
    return res
      .status(400)
      .send({ message: 'O campo "date" é obrigatório e "datedAt" e "rate" não podem ser vazios' });
  }
  const regex = /^([0-2][0-9]|(3)[0-1])(\/)(((0)[0-9])|((1)[0-2]))(\/)\d{4}$/i;
  if (!regex.test(date.datedAt)) {
    return res.status(400).send({ message: 'O campo "datedAt" deve ter o formato "dd/mm/aaaa"' });
  }
  next();
};

app.post('/crush',
  validateToken, validateName, validateAge,
  validateDate, validateRate, async (req, res) => {
    const crushList = await getCrushList();
  const { name, age, date } = req.body;
  const id = crushList.length + 1;

  const newCrush = ({ name, age, id, date });
  crushList.push(newCrush);

  try {
    await fs.writeFile(crushJSON, JSON.stringify(crushList));
    return res.status(201).send(newCrush);
  } catch (error) {
    return res.status(400).send({
      message: error.message,
    });
  }
});

app.put(crushID,
  validateToken, validateName, validateAge,
  validateDate, validateRate, async (req, res) => {
    const crushList = await getCrushList();
  const { name, age, date } = req.body;
  const { id } = req.params;
  const crushToUpdate = crushList.find((crush) => crush.id === Number(id));
  crushToUpdate.name = name;
  crushToUpdate.age = age;
  crushToUpdate.date = date;
  return res.status(200).send(crushToUpdate);
});

app.delete(crushID,
  validateToken, async (req, res) => {
    const crushList = await getCrushList();
  const { id } = req.params;
  const newCrushList = crushList.filter((crush) => crush.id !== Number(id));
  await fs.writeFile('./crush.json', JSON.stringify(newCrushList));
  return res.status(200).send({
    message: 'Crush deletado com sucesso',
  });
});
