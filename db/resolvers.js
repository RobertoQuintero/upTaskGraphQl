const Usuario = require("../models/Usuario");
const Proyecto = require("../models/Proyecto");
const Tarea = require("../models/Tarea");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
require("dotenv").config({ path: "variables.env" });

const crearToken = (usuario, secreta, expiresIn) => {
  const { id, email, nombre } = usuario;
  return jwt.sign({ id, email, nombre }, secreta, { expiresIn });
};

const resolvers = {
  Query: {
    obtenerProyectos: async (_, {}, ctx) => {
      const proyectos = await Proyecto.find({ creador: ctx.id });
      console.log(proyectos);
      return proyectos;
    },
    obtenerTareas: async (_, { input }, ctx) => {
      const tareas = await Tarea.find({ creador: ctx.id })
        .where("proyecto")
        .equals(input.proyecto);

      return tareas;
    },
  },
  Mutation: {
    crearUsuario: async (_, { input }, ctx) => {
      const { email, password } = input;

      const existeUsuario = await Usuario.findOne({ email });

      if (existeUsuario) {
        throw new Error("El usuario ya está registrado");
      }
      try {
        //hashear password
        const salt = await bcrypt.genSalt(10);
        input.password = await bcrypt.hash(password, salt);

        //Registrar nuevo user
        const nuevoUsuario = new Usuario(input);
        console.log(nuevoUsuario);
        nuevoUsuario.save();
        return "Usuario creado correctamente";
      } catch (error) {
        console.log(error);
      }
    },
    autenticarUsuario: async (_, { input }, ctx) => {
      const { email, password } = input;

      //si el user exite
      const existeUsuario = await Usuario.findOne({ email });

      if (!existeUsuario) {
        throw new Error("El usuario no existe");
      }

      //Si el password es correcto
      const passwordCorrecto = await bcrypt.compare(
        password,
        existeUsuario.password
      );
      if (!passwordCorrecto) {
        throw new Error("Password incorrecto");
      }

      //dar acceso a la app

      return {
        token: crearToken(existeUsuario, process.env.SECRETA, "4hr"),
      };
    },
    nuevoProyecto: async (_, { input }, ctx) => {
      console.log("resolver", ctx);
      try {
        const proyecto = new Proyecto(input);
        proyecto.creador = ctx.id;

        //almacenar en la base de datos
        const result = await proyecto.save();
        return result;
      } catch (error) {
        console.log(error);
      }
    },
    actualizarProyecto: async (_, { id, input }, ctx) => {
      //Revisar si el proecto existe
      let proyecto = await Proyecto.findById(id);
      if (!proyecto) {
        throw new Error("Proyecto no encontrado");
      }
      if (proyecto.creador.toString() !== ctx.id) {
        throw new Error("NO tienes las credenciales para editar");
      }
      //revisar si lapersona que trta de editar ees el creador

      proyecto = await Proyecto.findOneAndUpdate({ _id: id }, input, {
        new: true,
      });
      return proyecto;
    },
    eliminarProyecto: async (_, { id }, ctx) => {
      console.log("id", id);
      console.log("ctxid", ctx.id);
      let proyecto = await Proyecto.findById(id);
      if (!proyecto) {
        throw new Error("Proyecto no encontrado");
      }
      if (proyecto.creador.toString() !== ctx.id) {
        throw new Error("NO tienes las credenciales para editar");
      }

      //eliminar
      await Proyecto.findOneAndDelete({ _id: id });
      return "Proyecto eliminado";
    },
    nuevaTarea: async (_, { input }, ctx) => {
      try {
        const tarea = new Tarea(input);
        tarea.creador = ctx.id;
        const result = await tarea.save();
        return result;
      } catch (error) {
        console.log(error);
      }
    },
    actaulizarTarea: async (_, { id, input, estado }, ctx) => {
      //tarea existe?
      let tarea = await Tarea.findById(id);

      if (!tarea) {
        throw new Error("Taea no encontrada");
      }
      //propietario coincide
      if (tarea.creador.toString() !== ctx.id) {
        throw new Error("NO tienes las credenciales para editar");
      }
      //asignar estado
      input.estado = estado;
      //guardar y retornar la tarea

      tarea = await Tarea.findOneAndUpdate({ _id: id }, input, { new: true });
      return tarea;
    },
    eliminarTarea: async (_, { id }, ctx) => {
      let tarea = await Tarea.findById(id);

      if (!tarea) {
        throw new Error("Taea no encontrada");
      }
      //propietario coincide
      if (tarea.creador.toString() !== ctx.id) {
        throw new Error("NO tienes las credenciales para editar");
      }

      //eliminar

      await Tarea.findOneAndDelete({ _id: id });
      return "Tarea eliminada";
    },
  },
};

module.exports = resolvers;
