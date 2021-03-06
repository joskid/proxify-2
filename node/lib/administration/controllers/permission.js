var getData = function (req, res) {
  var models = coreServerApp.global.models['sequelize-postgres'];
  var Role = models.AdministrationRole;
  var Permission = models.AdministrationPermission;
  var Route = models.AdministrationRoute;
  var Application = models.ProxyApplication;
  var Token = coreServerApp.global.services.Token;

  Permission.findOne({
    include: [
      { model: Role },
      { model: Application },
      { model: Route }
    ],
    where: { id: req.params.id }
  }).then(function (permission) {
    if (permission != null) {
      if (permission.dataValues.applicationId)
        permission.dataValues.token = Token.generateTokenProxy(permission.dataValues);

      return res.status(200).json({
        meta: { count: 1 },
        data: permission.dataValues
      });
    } else {
      return res.status(500).json({ "error": "Resource not found" });
    }

  }, function (error) {
    return res.status(500).json({ "error": "Can't fetch data" });
  });
};

var createData = function (req, res) {
  var models = coreServerApp.global.models['sequelize-postgres'];
  var Permission = models.AdministrationPermission;
  var Token = coreServerApp.global.services.Token;

  if (typeof (req.body.data) != 'undefined') {
    if (typeof (req.body.data.name) != 'undefined') {
      Permission.create(req.body.data).then(function (permission) {
        if (permission != null) {
          if (typeof (req.body.data.application) != 'undefined') {
            var application = req.body.data.application.id ? req.body.data.application.id : null;
            permission.setApplication(application);
          }
          if (permission.dataValues.applicationId)
            permission.dataValues.token = Token.generateTokenProxy(permission.dataValues);

          if (typeof (req.body.data.roles) != 'undefined') {
            permission.setRoles(_.map(req.body.data.roles, 'id')).then(function (success) {
            }, function (err) {
              return res.status(500).json({ "error": "Error during processing" });
            });
          }

          if (typeof (req.body.data.routes) != 'undefined') {
            permission.setRoutes(_.map(req.body.data.routes, 'id')).then(function (success) {
            }, function (err) {
              return res.status(500).json({ "error": "Error during processing" });
            });
          }

          var data = {
            meta: { count: 1 },
            data: permission.dataValues
          };
          return res.status(200).json(data);

        } else {
          return res.status(500).json({ "error": "Resource not found" });
        }

      }, function (error) {
        var errorMessage = "Error:";
        _.forEach(error.errors, function (data, dataKey) {
          errorMessage += " " + data.message;
        });
        return res.status(500).json({ "error": errorMessage });
      });
    } else {
      return res.status(500).json({ "error": "Missing Name field" });
    }
  } else {
    return res.status(500).json({ "error": "Missing Payload" });
  }

};

var updateData = function (req, res) {
  var models = coreServerApp.global.models['sequelize-postgres'];
  var Permission = models.AdministrationPermission;

  if (typeof (req.body.data) != 'undefined') {
    Permission.update(req.body.data, {
      where: { id: req.params.id }
    }).then(function (permission) {
      if (permission != null) {
        console.log('debug permissions ', req.body.data.application);
          console.log('debug permissions ', req.body.data.application.id);
          Permission.findOne({
            where: { id: req.params.id }
          }).then(function (permission) {
            if (permission != null) {
              if (typeof (req.body.data.application) != 'undefined') {
                var application = req.body.data.application.id ? req.body.data.application.id : null;
                console.log('debug permissions ', application);
                permission.setApplication(application);
              }

              if (typeof (req.body.data.roles) != 'undefined')
                permission.setRoles(_.map(req.body.data.roles, 'id'));

              if (typeof (req.body.data.routes) != 'undefined')
                permission.setRoutes(_.map(req.body.data.routes, 'id'));
            }
          });


        return res.status(200).json({
          meta: { count: 1 },
          data: { id: req.params.id }
        });
      } else {
        return res.status(500).json({ "error": "Resource not found" });
      }

    }, function (error) {
      return res.status(500).json({ "error": "Can't fetch data" });
    });
  } else {
    return res.status(500).json({ "error": "Missing Payload" });
  }

};

var deleteData = function (req, res) {
  var models = coreServerApp.global.models['sequelize-postgres'];
  var Permission = models.AdministrationPermission;
  if (typeof (req.params.id) != 'undefined') {
    Permission.destroy({
      where: { id: req.params.id }
    }).then(function (permission) {
      if (permission != null) {
        return res.status(200).json({
          meta: { count: 1 },
          data: { id: req.params.id }
        });
      } else {
        return res.status(500).json({ "error": "Resource not found" });
      }
    }, function (error) {
      return res.status(500).json({ "error": "Can't fetch data" });
    });
  } else {
    return res.status(500).json({ "error": "Missing Payload" });
  }
};

var listData = function (req, res) {
  var models = coreServerApp.global.models['sequelize-postgres'];
  var Role = models.AdministrationRole;
  var Group = models.AdministrationGroup;
  var User = models.AdministrationUser;
  var Permission = models.AdministrationPermission;
  var Route = models.AdministrationRoute;
  var Application = models.ProxyApplication;
  var Token = coreServerApp.global.services.Token;

  var limit = 10;
  if (typeof (req.query.limit) != 'undefined') {
    // validator int
    limit = parseInt(req.query.limit);
  }
  var offset = 0;
  if (typeof (req.query.offset) != 'undefined') {
    // validator int
    offset = parseInt(req.query.offset);
  }
  var filter = {};
  var whereQuery = {};
  if (typeof (req.query.filter) != 'undefined') {
    if (req.query.filter != '') {
      // validator int
      var likeOp = null;
      if (models.ProxyApplication.options.sequelize.options.dialect == 'postgres') {
        // search with case insensitive on postgres
        likeOp = SeqOp.iLike;
      } else {
        likeOp = SeqOp.like;
      }

      filter = JSON.parse(req.query.filter);

      _.forEach(filter, function (data, key) {
        var splitData = key.split('.');
        var keyData = "permission";
        var dataSearch = '';
        if (splitData.length > 1) {
          keyData = splitData[0];
          dataSearch = splitData[1];
        } else {
          dataSearch = splitData[0];
        }

        if (typeof (whereQuery[keyData]) == 'undefined')
          whereQuery[keyData] = {};

        whereQuery[keyData][dataSearch] = {
          [likeOp]: '%' + data + '%'
        };
      });
      console.log("where condition ", whereQuery);
    }
  }

  // var order = [[Permission.associations['users'], 'username', 'DESC']];
  var order = [['name', 'ASC']];
  if (typeof (req.query.order) != 'undefined') {
    var orderParsingError = false;
    creationOrder = [];
    var orderSplit = req.query.order.split(",");
    _.forEach(orderSplit, function (data, dataKey) {

      var tmpOrder = data.split('|');

      if (tmpOrder.length > 1) {
        if (tmpOrder.length == 3 && typeof (Permission.associations[tmpOrder[0]]) == 'undefined')
          orderParsingError = true;

        var finalSplit = [];
        _.forEach(tmpOrder, function (data, dataKey) {
          _.forEach(data.split('.'), function (dataLoop, dataKey) {
            finalSplit.push(dataLoop);
          });
        });

        if (finalSplit.length > 2) {
          // [Task, 'createdAt', 'DESC'],
          if (finalSplit[0] == 'application')
            finalSplit[0] = Application;
          if (finalSplit[0] == 'role')
            finalSplit[0] = Role;

          console.log("Final Split ", finalSplit);

          creationOrder.push(finalSplit);
        } else {
          creationOrder.push(tmpOrder);
        }
      }
    });

    if (orderParsingError)
      return res.status(500).json({ "error": "Problem with parsing ordering" });

    if (creationOrder.length > 0)
      order = creationOrder;
  }

  var include = [
    {
      model: Role,
      where: whereQuery['roles'] || null,
      include: [
        {
          model: Group,
          include: [
            { model: User }
          ]
        }
      ]
    },
    {
      model: Application,
      where: whereQuery['application'] || null
    },
    {
      model: Route,
      where: whereQuery['routes'] || null
    },
  ];

  Permission.findAndCountAll({
    offset: offset,
    limit: limit,
    where: whereQuery['permission'] || null,
    distinct: true,
    include: include,
    order: order
  }).then(function (permissions) {
    _.forEach(permissions.rows, function (perm, permKey) {
      if (perm.dataValues.applicationId)
        perm.dataValues.token = Token.generateTokenProxy(perm.dataValues);
    });

    return res.status(200).json({
      meta: { offset: offset, limit: limit, count: permissions.count },
      data: permissions.rows
    });
  }, function (error) {
    return res.status(500).json({ "error": "Can't fetch data" });
  });
};

module.exports = {
  listData: listData,
  getData: getData,
  createData: createData,
  updateData: updateData,
  deleteData: deleteData,
};
